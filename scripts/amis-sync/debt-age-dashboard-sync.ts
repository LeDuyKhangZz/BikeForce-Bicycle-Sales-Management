import type { Page } from '@playwright/test';
import { ensureSelected } from '../../lib/amis/ensure-selected';
import { getVietnamCurrentMonth } from '../../lib/date';

const REPORT_URL =
  'https://actapp.misa.vn/app/RP/ReportList/RPDynamicViewer/ReceivableDetailByDebtAge';

type DebtAgeValues = {
  totalDebt: number;
  noDueDate: number;
  beforeDue0To30: number;
  overdue1To30: number;
  overdue31To60: number;
  overdue61To90: number;
  overdue91To120: number;
  overdueOver120: number;
  totalOverdue: number;
};

function amount(value: string | undefined): number {
  const normalized = (value ?? '').replace(/[^0-9]/gu, '');
  return normalized ? Number(normalized) : 0;
}

function dashboardSyncUrl(): string {
  const source = process.env.DASHBOARD_REPORT26_SYNC_URL?.trim() ?? '';
  return source.replace(/\/amis-report-sync$/, '/amis-receivable-age-sync');
}

export async function syncDebtAgeDashboard(page: Page): Promise<DebtAgeValues> {
  const target = dashboardSyncUrl();
  const secret = process.env.DASHBOARD_REPORT_SYNC_SECRET?.trim() ?? '';
  if (!target || !secret) throw new Error('Thiếu cấu hình URL hoặc secret đồng bộ Dashboard.');

  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByRole('button').filter({ hasText: /tham/i }).first().click({ timeout: 60_000 });

  const selectAll = page.locator('label.con-ms-checkbox:visible').first();
  await selectAll.waitFor({ state: 'visible', timeout: 30_000 });
  await ensureSelected({
    isChecked: () => selectAll.locator('input[type="checkbox"]').isChecked(),
    select: () => selectAll.click(),
  });

  const viewReport = page.locator('[data-testid="sme_rdbdap_msbtn_reviewreport"]:visible');
  await viewReport.click({ timeout: 30_000 });
  const totalRow = page.locator('tr.ms-tr-viewer:visible').filter({ hasText: /T.ng c.ng/i }).last();
  await totalRow.waitFor({ state: 'visible', timeout: 120_000 });
  const cells = await totalRow.locator('th').evaluateAll((elements) =>
    elements.map((element) => element.textContent?.replace(/\s+/gu, ' ').trim() ?? ''),
  );
  if (cells.length < 19) throw new Error(`Dòng tổng công nợ không đủ cột (${cells.length}).`);

  const values: DebtAgeValues = {
    totalDebt: amount(cells[5]), noDueDate: amount(cells[6]), beforeDue0To30: amount(cells[7]),
    overdue1To30: amount(cells[13]), overdue31To60: amount(cells[14]), overdue61To90: amount(cells[15]),
    overdue91To120: amount(cells[16]), overdueOver120: amount(cells[17]), totalOverdue: amount(cells[18]),
  };
  if (!values.totalDebt || values.totalDebt !== values.noDueDate + values.beforeDue0To30 + values.totalOverdue) {
    throw new Error('Tổng công nợ tuổi nợ không khớp, không đẩy dữ liệu chưa tin cậy.');
  }

  const response = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-amis-report-sync-secret': secret },
    body: JSON.stringify({ month: getVietnamCurrentMonth(), generatedAt: new Date().toISOString(), values }),
  });
  if (!response.ok) throw new Error(`Dashboard công nợ theo tuổi nợ HTTP ${response.status}.`);
  console.log(`   -> Đã đồng bộ công nợ tuổi nợ: ${values.totalDebt.toLocaleString('vi-VN')} đ.`);
  return values;
}
