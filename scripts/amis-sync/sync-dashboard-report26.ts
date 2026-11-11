import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getVietnamCurrentMonth, getVietnamMonthRange } from '../../lib/date';

const here = dirname(fileURLToPath(import.meta.url));
// Worker cha da nap .env.local. Phien AMIS moi nhat lai duoc amis-harvest
// ghi vao file nay, nen bat buoc ghi de bien ke thua de khong dung token cu.
config({ path: resolve(here, '.env'), quiet: true, override: true });

const reportUrl = 'https://amisapp.misa.vn/crm/g1/api/report/report/Grid';
const dashboardSyncUrl = process.env.DASHBOARD_REPORT26_SYNC_URL?.trim() || '';
const dashboardSyncSecret = process.env.DASHBOARD_REPORT_SYNC_SECRET?.trim() || '';

function reportParameters(monthValue: string) {
  const range = getVietnamMonthRange(monthValue);
  if (range === null) throw new Error(`Ky Report 26 khong hop le: ${monthValue}`);

  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) throw new Error(`Ky Report 26 khong hop le: ${monthValue}`);
  const lastDay = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const firstWeekEnd = firstDayOfWeek === 0 ? 8 : 8 - firstDayOfWeek;
  const weeks: Array<[number, number]> = [[1, firstWeekEnd]];
  for (let start = firstWeekEnd + 1; start <= lastDay; start += 7) weeks.push([start, Math.min(start + 6, lastDay)]);
  while (weeks.length < 5) weeks.push([lastDay, lastDay]);

  const date = (day: number) => new Date(Date.UTC(year, month - 1, day)).toISOString();
  const data: Record<string, unknown> = {
    Year: year, Month: String(month), ReportTypeID: 5, ReportTypeIDText: 'Doanh so de nghi ghi',
    StatisticalsBy: '1,3', StatisticalsByText: 'Don hang,Tra lai hang ban', Period: 13,
    FromDate: date(1), ToDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString(),
    AnalysisType: 2, AnalysisTypeText: 'Co cau to chuc', OrganizationUnitID: 4,
    OrganizationUnitIDText: 'VAN THINH', MISACode: '0001/0013', ID: 26,
    IsFilterDraffSaleOrder: false, IsLastOrganization: 0, ReportDynamicID: 0,
    Config: { GroupColumn: [], Filter: [], Formula: '', FormulaContent: '' }, ProductStatisticsID: '1',
    ProductStatisticsIDText: 'Hang hoa', WeekText: '', HasPermission: true, Weeks: null, GroupID: null,
    MonthText: `Thang ${month}`, IsDisplay: true, IsViewEmployee: true,
  };
  weeks.slice(0, 5).forEach(([from, to], index) => {
    data[`FromDateWeek${index + 1}`] = date(from);
    data[`ToDateWeek${index + 1}`] = date(to);
  });
  return data;
}

async function main(): Promise<void> {
  if (!dashboardSyncUrl || !dashboardSyncSecret) {
    throw new Error('Thieu DASHBOARD_REPORT26_SYNC_URL hoac DASHBOARD_REPORT_SYNC_SECRET trong scripts/amis-sync/.env.');
  }
  const token = process.env.AMIS_BEARER_TOKEN?.trim() || '';
  const cookie = process.env.AMIS_COOKIE?.trim() || '';
  const companyCode = process.env.AMIS_COMPANY_CODE?.trim() || '';
  if (!token || !cookie || !companyCode) {
    throw new Error('Thieu phien CRM AMIS. Chay amis-harvest.ts --crm-only de lam moi token va cookie.');
  }

  const requestedMonthIndex = process.argv.indexOf('--month');
  const requestedMonth = requestedMonthIndex >= 0 ? process.argv[requestedMonthIndex + 1] : undefined;
  const month = requestedMonth || getVietnamCurrentMonth();
  const parameters = reportParameters(month);
  const response = await fetch(reportUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*', Authorization: `Bearer ${token}`,
      Cookie: cookie, 'Content-Type': 'application/json', companycode: companyCode,
      layoutcode: 'Report', 'X-MISA-Language': 'vi-VN', Origin: 'https://amisapp.misa.vn',
      Referer: 'https://amisapp.misa.vn/crm/report/view/26/0',
    },
    body: JSON.stringify({ ID: 26, IsGetCache: false, Data: parameters }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`AMIS Report 26 HTTP ${response.status}`);

  const report = await response.json() as { Success?: boolean; Data?: unknown[]; SummaryData?: Record<string, unknown> };
  if (!report.Success || !Array.isArray(report.Data) || !report.SummaryData) {
    throw new Error('AMIS Report 26 tra ve du lieu khong hop le.');
  }

  const publish = await fetch(dashboardSyncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-amis-report-sync-secret': dashboardSyncSecret },
    body: JSON.stringify({ month, generatedAt: new Date().toISOString(), parameters, summary: report.SummaryData, rows: report.Data }),
    cache: 'no-store',
  });
  if (!publish.ok) throw new Error(`Dashboard Report 26 sync HTTP ${publish.status}`);
  console.log(`Da dong bo Report 26 ${month} (${report.Data.length} dong) sang Dashboard.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Dong bo Report 26 that bai.');
  process.exitCode = 1;
});
