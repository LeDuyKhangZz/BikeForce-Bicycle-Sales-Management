export const CUSTOMER_PLAN_CSV_HEADERS = [
  'MISA customer ID',
  'Mã khách hàng',
  'Tên khách hàng',
  'Tần suất/tháng',
  'Doanh số cam kết (VND)',
] as const;

export type CustomerPlanCsvRow = {
  customerId: number;
  monthlyFrequency: number;
  committedSales: number | null;
};

export type CustomerPlanCsvError = { line: number; message: string };

export type CustomerPlanCsvResult = {
  rows: CustomerPlanCsvRow[];
  errors: CustomerPlanCsvError[];
};

function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildCustomerPlanCsv(rows: Array<{
  customerId: number;
  customerCode: string;
  customerName: string;
  monthlyFrequency: number;
  committedSales: number | null;
}>): string {
  const body = rows.map((row) => [
    row.customerId,
    row.customerCode,
    row.customerName,
    row.monthlyFrequency,
    row.committedSales ?? '',
  ]);
  return `\uFEFF${[CUSTOMER_PLAN_CSV_HEADERS, ...body]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += character;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function integerFromCell(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseCustomerPlanCsv(text: string): CustomerPlanCsvResult {
  const parsedRows = parseCsv(text.replace(/^\uFEFF/, ''));
  return parseCustomerPlanCells(parsedRows);
}

export function parseCustomerPlanCells(parsedRows: string[][]): CustomerPlanCsvResult {
  const header = parsedRows[0];
  if (header === undefined || CUSTOMER_PLAN_CSV_HEADERS.some((value, index) => header[index]?.trim() !== value)) {
    return { rows: [], errors: [{ line: 1, message: 'File không đúng mẫu kế hoạch khách hàng.' }] };
  }

  const rows: CustomerPlanCsvRow[] = [];
  const errors: CustomerPlanCsvError[] = [];
  const customerIds = new Set<number>();
  parsedRows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((value) => value.trim() === '')) return;
    const customerId = integerFromCell(cells[0] ?? '');
    const monthlyFrequency = integerFromCell(cells[3] ?? '');
    const committedText = (cells[4] ?? '').trim();
    const committedSales = committedText === '' ? null : integerFromCell(committedText);
    if (customerId === null || customerId <= 0) {
      errors.push({ line, message: 'MISA customer ID không hợp lệ.' });
      return;
    }
    if (customerIds.has(customerId)) {
      errors.push({ line, message: `Khách hàng ${customerId} bị lặp trong file.` });
      return;
    }
    if (monthlyFrequency === null || monthlyFrequency < 0 || monthlyFrequency > 31) {
      errors.push({ line, message: 'Tần suất phải là số nguyên từ 0 đến 31.' });
      return;
    }
    if (committedSales === null && committedText !== '') {
      errors.push({ line, message: 'Doanh số cam kết phải là số nguyên VND hoặc để trống.' });
      return;
    }
    if (committedSales !== null && committedSales > 999_999_999_999) {
      errors.push({ line, message: 'Doanh số cam kết vượt giới hạn cho phép.' });
      return;
    }
    customerIds.add(customerId);
    rows.push({ customerId, monthlyFrequency, committedSales });
  });
  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: 2, message: 'File chưa có dòng khách hàng nào.' });
  }
  return { rows, errors };
}
