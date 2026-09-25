import 'server-only';

import ExcelJS from 'exceljs';

import { CUSTOMER_PLAN_CSV_HEADERS } from '@/lib/amis/customer-plan-csv';

type Row = {
  customerId: number;
  customerCode: string;
  customerName: string;
  monthlyFrequency: number;
  committedSales: number | null;
};

export async function buildCustomerPlanXlsx(rows: Row[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BikeForce';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Kế hoạch khách hàng', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = [
    { header: CUSTOMER_PLAN_CSV_HEADERS[0], key: 'customerId', width: 19 },
    { header: CUSTOMER_PLAN_CSV_HEADERS[1], key: 'customerCode', width: 18 },
    { header: CUSTOMER_PLAN_CSV_HEADERS[2], key: 'customerName', width: 42 },
    { header: CUSTOMER_PLAN_CSV_HEADERS[3], key: 'monthlyFrequency', width: 20 },
    { header: CUSTOMER_PLAN_CSV_HEADERS[4], key: 'committedSales', width: 27 },
  ];
  for (const row of rows) sheet.addRow(row);
  sheet.autoFilter = { from: 'A1', to: 'E1' };
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0877C1' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn(1).numFmt = '0';
  sheet.getColumn(4).numFmt = '0';
  sheet.getColumn(5).numFmt = '#,##0';
  sheet.getColumn(1).alignment = { horizontal: 'center' };
  sheet.getColumn(4).alignment = { horizontal: 'center' };
  sheet.getColumn(5).alignment = { horizontal: 'right' };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 22;
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      cell.alignment = { ...cell.alignment, vertical: 'middle' };
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
