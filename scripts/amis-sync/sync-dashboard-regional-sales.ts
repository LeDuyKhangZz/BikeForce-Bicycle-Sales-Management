import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectToSharedAmisBrowser } from './shared-browser';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '.env'), quiet: true, override: true });

type AmisRegionRow = { ID?: unknown; FullName?: unknown; CurrentAmount?: unknown; MISACode?: unknown };
type RegionRow = { name: string; value: number; organizationUnitId: number; misaCode: string };
type CapturedWidget = { parameters: Record<string, unknown>; rows: RegionRow[] };

function selectedMonth(): string {
  const index = process.argv.indexOf('--month');
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Cần truyền --month YYYY-MM.');
  return value;
}

function crmDateRange(monthValue: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthValue);
  if (!match) throw new Error('Cần truyền --month YYYY-MM.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  // AMIS trả các mốc theo UTC; giờ này tương ứng 00:00 và 23:59:59 tại Việt Nam.
  return {
    fromDate: new Date(Date.UTC(year, month - 1, 1, -7)).toISOString(),
    toDate: new Date(Date.UTC(year, month - 1, lastDay, 16, 59, 59, 999)).toISOString(),
  };
}

function widgetParameter(month: string): Record<string, unknown> {
  const { fromDate, toDate } = crmDateRange(month);
  return {
    Config: null, Period: 13, ToDate: toDate, DateData: { FromDate: fromDate, ToDate: toDate, Period: 13 }, FromDate: fromDate,
    IsGetNew: false, MISACode: '0001/0013/0014', EmployeeID: null, IsGetCache: false, ReportType: '3', DashboardID: 18,
    ReloadAllBy: 999, AnalysisType: 2, DashboardKey: 'StateEffectuateSaleForecast', IsChangedAll: false,
    DashboardName: 'Dashboard_StateEffectuateSaleForecast', DashboardType: 9, HasPermission: true, EmployeeIDText: null,
    AnalysisTypeText: 'Cơ cấu tổ chức', IsGetCacheClient: false, RevenueStatusIDs: '3', DashboardFullName: 'Mục tiêu doanh số theo đơn vị',
    IsLastOrganization: 0, OrganizationUnitID: 9, IsParentSaleOrderID: '1,3', RevenueStatusIDsText: 'Đã ghi',
    OrganizationUnitIDText: 'Phòng kinh doanh', UserOrganizationUnitID: 1, IsIncludeDraftSaleOrder: false,
    IsParentSaleOrderIDText: 'ReportOpportunityStage.IsChildSaleOrder,LayoutCode.ReturnSale', UserOrganizationUnitIDText: 'THỐNG ĐẠT GROUP',
    IsIncludeOrdersBelongToParentOnes: false,
  };
}

async function main(): Promise<void> {
  const month = selectedMonth();
  const reportSyncUrl = process.env.DASHBOARD_REPORT26_SYNC_URL?.trim() || '';
  const syncUrl = process.env.DASHBOARD_REGIONAL_SALES_SYNC_URL?.trim() || reportSyncUrl.replace(/\/amis-report-sync$/, '/amis-regional-sales-sync');
  const secret = process.env.DASHBOARD_REPORT_SYNC_SECRET?.trim() || '';
  if (!syncUrl || !secret) throw new Error('Thiếu cấu hình URL hoặc mã bảo mật đồng bộ Dashboard.');

  const expectedFromDate = crmDateRange(month).fromDate;
  const shared = await connectToSharedAmisBrowser({ pageUrl: /amisapp\.misa\.vn/ });
  const captured: { current: CapturedWidget | null } = { current: null };
  const captureWidget = async (response: import('@playwright/test').Response) => {
    if (!/\/crm\/g\d+\/api\/dashboard\/Dashboard\/18\/data/.test(response.url()) || !response.ok()) return;
    try {
      const requestBody = response.request().postDataJSON() as { Param?: unknown } | null;
      const parameters = typeof requestBody?.Param === 'string' ? JSON.parse(requestBody.Param) as Record<string, unknown> : null;
      if (!parameters || parameters.FromDate !== expectedFromDate) return;
      const result = await response.json() as { Data?: unknown; data?: unknown };
      const rawData = result.Data ?? result.data;
      const source = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      if (!Array.isArray(source)) return;
      const rows = (source as AmisRegionRow[]).map((row) => ({
      name: typeof row.FullName === 'string' ? row.FullName : 'Không rõ', value: Number(row.CurrentAmount || 0),
      organizationUnitId: Number(row.ID || 0), misaCode: typeof row.MISACode === 'string' ? row.MISACode : '',
      })).filter((row) => Number.isFinite(row.value));
      if (rows.length > 0) captured.current = { parameters, rows };
    } catch { /* The widget can be reloaded while the CRM page is navigating. */ }
  };
  try {
    shared.context.on('response', captureWidget);
    await shared.page.goto('https://amisapp.misa.vn/crm/dashboard/main', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await shared.page.waitForTimeout(25_000);
  } finally {
    shared.context.off('response', captureWidget);
    await shared.disconnect();
  }
  if (!captured.current) throw new Error(`Không nhận được biểu đồ AMIS cho ${month}. Giữ AMIS CRM đang đăng nhập và thử lại.`);
  const widget = captured.current;
  const publish = await fetch(syncUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-amis-report-sync-secret': secret },
      body: JSON.stringify({ month, generatedAt: new Date().toISOString(), parameters: widget.parameters, rows: widget.rows }), cache: 'no-store',
  });
  if (!publish.ok) throw new Error(`Dashboard doanh số khu vực HTTP ${publish.status}`);
  console.log(`Đã đồng bộ doanh số theo đơn vị ${month} (${widget.rows.length} đơn vị) sang Dashboard.`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Đồng bộ doanh số khu vực thất bại.'); process.exitCode = 1; });
