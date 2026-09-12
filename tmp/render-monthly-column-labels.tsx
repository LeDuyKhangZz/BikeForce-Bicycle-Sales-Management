import { readFile, writeFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';
import { MonthlySummaryCard } from '../features/report-share/monthly-summary-card';
import { buildMonthlySummaryCardModel } from '../lib/reports/monthly-summary-card';

async function main() {
  const model = buildMonthlySummaryCardModel({
    month: '2026-08', salesName: 'Nguyễn Thị Kim Hương', employeeCode: null,
    performance: {
      amisTargetAmount: null, amisSalesActual: 168805000, amisReceiveAmount: 163821200,
      amisAccountInCharge: 2, amisAccountInteractive: 8, amisAccountSold: 7,
      amisOrderCount: 10, amisReturnAmount: 369000, syncedAt: '2026-09-12T00:00:00Z',
      monthlyTargetSalesAmount: null, monthlyTargetRevenue: null, targetRevenue: 0,
    },
    saleWork: {
      conversations: 634, sentMessages: 30796, receivedMessages: 25868,
      outgoingCalls: 202, incomingCalls: 153, callDuration: '16.11',
    },
    travelExpense: null, salary: null,
  });
  const fonts = await Promise.all(([400, 600, 700] as const).map(async weight => ({
    name: 'Inter', style: 'normal' as const, weight,
    data: await readFile(`public/fonts/Inter-${weight === 400 ? 'Regular' : weight === 600 ? 'SemiBold' : 'Bold'}.ttf`),
  })));
  const response = new ImageResponse(<MonthlySummaryCard model={model} />, { width: 1080, height: 1920, fonts });
  await writeFile('tmp/monthly-column-labels.png', Buffer.from(await response.arrayBuffer()));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
