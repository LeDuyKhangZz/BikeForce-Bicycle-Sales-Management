import { NextResponse } from 'next/server';

import { hasValidWebhookToken } from '@/lib/security/webhook-token';
import { createReportAutomationClient } from '@/lib/supabase/admin';
import { hatdeSnapshotSchema } from '@/lib/validation/hatde-snapshot';
import { upsertHatdeSnapshot } from '@/services/hatde';

export async function POST(request: Request) {
  if (!hasValidWebhookToken(
    request.headers.get('x-gustino-token'),
    process.env.N8N_REPORT_WEBHOOK_TOKEN,
  )) {
    return NextResponse.json({ error: 'Không được phép.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body phải là JSON hợp lệ.' }, { status: 400 });
  }

  const parsed = hatdeSnapshotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Dữ liệu snapshot không hợp lệ.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const branches = parsed.data.branches;
  const totalRevenue = branches.reduce((total, branch) => total + branch.revenue, 0);
  const totalTransactions = branches.reduce((total, branch) => total + branch.transactions, 0);

  const result = await upsertHatdeSnapshot(createReportAutomationClient(), {
    report_date: parsed.data.report_date,
    report_time: parsed.data.report_time,
    branches,
    totalRevenue,
    totalTransactions,
  });

  if (result === null) {
    return NextResponse.json({ error: 'Không thể lưu snapshot.' }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
