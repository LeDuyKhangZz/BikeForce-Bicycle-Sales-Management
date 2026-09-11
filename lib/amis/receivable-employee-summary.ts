export type ReceivableEmployeeSummary = Readonly<{
  tenNhanVien: string;
  maSo: string;
  soTienThanhToan: number;
}>;

const EMPLOYEE_TOTAL_PATTERN =
  /^Tên nhân viên:\s*(.+?)\s*\((\d+)\)\s*([\d.,]+)$/u;

export function parseReceivableEmployeeTotal(
  rowText: string,
): ReceivableEmployeeSummary | null {
  const normalized = rowText.replace(/\s+/gu, ' ').trim();
  const match = EMPLOYEE_TOTAL_PATTERN.exec(normalized);
  if (match === null) return null;

  const [, employeeName, employeeCode, amountText] = match;
  if (!employeeName || !employeeCode || !amountText) return null;

  const amount = Number(amountText.replace(/[^\d]/gu, ''));
  if (!Number.isSafeInteger(amount)) return null;

  return {
    tenNhanVien: employeeName.trim(),
    maSo: employeeCode,
    soTienThanhToan: amount,
  };
}

export function mergeReceivableEmployeeSummaries(
  pages: readonly (readonly ReceivableEmployeeSummary[])[],
): ReceivableEmployeeSummary[] {
  const summaries = new Map<string, ReceivableEmployeeSummary>();

  for (const page of pages) {
    for (const summary of page) {
      const key = `${summary.tenNhanVien}\u0000${summary.maSo}`;
      const existing = summaries.get(key);
      if (
        existing !== undefined &&
        existing.soTienThanhToan !== summary.soTienThanhToan
      ) {
        throw new Error(
          `MISA tra hai tong tien khac nhau cho ${summary.tenNhanVien} (${summary.maSo}).`,
        );
      }
      summaries.set(key, summary);
    }
  }

  return [...summaries.values()];
}
