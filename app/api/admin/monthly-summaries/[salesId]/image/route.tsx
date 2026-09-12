import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import { z } from 'zod';

import { MonthlySummaryCard } from '@/features/report-share/monthly-summary-card';
import { buildMonthlySummaryCardModel } from '@/lib/reports/monthly-summary-card';
import { MONTHLY_ACCOUNTING_PARTICIPANT } from '@/lib/reports/monthly-summary-participants';
import { getMonthlySummaryParticipant } from '@/features/admin-monthly-summaries/queries';
import { createClient } from '@/lib/supabase/server';
import { salaryMonthSchema } from '@/lib/validation/salaries';
import { getMonthlyTargets } from '@/services/monthly-targets';
import { getSessionProfile } from '@/services/profiles';
import { getAmisMetricsForShare } from '@/services/reports';
import { getMonthlySalary } from '@/services/salaries';
import { getMonthlySaleWorkReportByAccountName } from '@/services/salework';
import { getMonthlyTravelExpense } from '@/services/travel-expenses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

const salesIdSchema = z.union([z.uuid(), z.literal(MONTHLY_ACCOUNTING_PARTICIPANT.id)]);
const FONT_FILES = [
  { file: 'Inter-Regular.ttf', weight: 400 },
  { file: 'Inter-SemiBold.ttf', weight: 600 },
  { file: 'Inter-Bold.ttf', weight: 700 },
] as const;

type SummaryFont = {
  name: 'Inter';
  data: Buffer;
  weight: (typeof FONT_FILES)[number]['weight'];
  style: 'normal';
};

let fontsPromise: Promise<SummaryFont[]> | null = null;

function loadFonts(): Promise<SummaryFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, weight }): Promise<SummaryFont> => ({
      name: 'Inter',
      data: await readFile(join(process.cwd(), 'public', 'fonts', file)),
      weight,
      style: 'normal',
    })),
  );
  return fontsPromise;
}

function jsonError(status: number, message: string): Response {
  return Response.json({ code: 'MONTHLY_SUMMARY_ERROR', message }, { status });
}

type Context = { params: Promise<{ salesId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  const { salesId } = await context.params;
  const url = new URL(request.url);
  const monthResult = salaryMonthSchema.safeParse(url.searchParams.get('month'));
  if (!salesIdSchema.safeParse(salesId).success || !monthResult.success) {
    return jsonError(400, 'Nhân viên hoặc tháng không hợp lệ.');
  }

  const month = monthResult.data;
  const periodMonth = `${month}-01`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, 'Phiên đăng nhập đã hết hạn.');

  const admin = await getSessionProfile(supabase, user.id);
  if (admin?.role !== 'ADMIN' || !admin.is_active) {
    return jsonError(403, 'Bạn không có quyền xem tổng kết tháng.');
  }

  const sales = await getMonthlySummaryParticipant(supabase, salesId);
  if (sales === null) return jsonError(404, 'Không tìm thấy nhân viên.');

  const saleWorkAccountName = sales.saleWorkAccountName;
  const [amis, monthlyTargets, saleWorkReport, travelExpense, salary] = await Promise.all([
    getAmisMetricsForShare(supabase, sales.amis_employee_name, periodMonth),
    sales.profileId === null ? Promise.resolve(null) : getMonthlyTargets(supabase, sales.profileId, periodMonth),
    saleWorkAccountName === null
      ? Promise.resolve(null)
      : getMonthlySaleWorkReportByAccountName(saleWorkAccountName, month),
    sales.profileId === null ? Promise.resolve(null) : getMonthlyTravelExpense(supabase, sales.profileId, periodMonth),
    sales.profileId === null ? Promise.resolve(null) : getMonthlySalary(supabase, sales.profileId, periodMonth),
  ]);

  const performance =
    amis === null
      ? null
      : {
          amisTargetAmount: amis.target_amount,
          amisSalesActual: amis.current_amount,
          amisReceiveAmount: amis.receive_amount,
          amisAccountInCharge: amis.qty_account_in_charge,
          amisAccountInteractive: amis.qty_account_interactive,
          amisAccountSold: amis.qty_account_sold_this_period,
          amisOrderCount: amis.no_of_orders,
          amisReturnAmount: amis.return_sales,
          syncedAt: amis.synced_at,
          monthlyTargetSalesAmount: monthlyTargets?.target_sales_amount ?? null,
          monthlyTargetRevenue: monthlyTargets?.target_revenue ?? null,
          // Tổng kết tháng không dùng cam kết tự nhập mỗi ngày của Sales.
          targetRevenue: 0,
        };

  const saleWork =
    saleWorkReport === null
      ? null
      : {
          conversations: saleWorkReport.conversations,
          sentMessages: saleWorkReport.sentMessages,
          receivedMessages: saleWorkReport.receivedMessages,
          outgoingCalls: saleWorkReport.outgoingCalls,
          incomingCalls: saleWorkReport.incomingCalls,
          callDuration: saleWorkReport.callDuration,
        };

  const model = buildMonthlySummaryCardModel({
    month,
    salesName: sales.full_name,
    employeeCode: sales.employee_code,
    performance,
    saleWork,
    travelExpense,
    salary,
  });

  try {
    return new ImageResponse(<MonthlySummaryCard model={model} />, {
      width: 1080,
      height: 1920,
      fonts: await loadFonts(),
      headers: {
        'Content-Disposition': `inline; filename="Tong-ket-thang-${month}.png"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[monthly-summary-image]', error);
    return jsonError(500, 'Không thể tạo ảnh tổng kết tháng.');
  }
}
