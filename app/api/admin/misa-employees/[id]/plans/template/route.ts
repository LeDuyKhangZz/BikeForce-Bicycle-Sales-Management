import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentProfile } from '@/features/auth/queries';
import { buildCustomerPlanXlsx } from '@/lib/amis/customer-plan-xlsx-server';
import { defaultMonthlyFrequency, getCustomerRevenueGroup } from '@/lib/amis/customer-revenue-group';
import { resolveVietnamMonth } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { listMisaCustomerPlanTemplateRows } from '@/services/misa-customer-plans';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context): Promise<NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ message: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
  if (!profile.is_active || profile.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Bạn không có quyền tải file mẫu.' }, { status: 403 });
  }
  const { id } = await context.params;
  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ message: 'Nhân viên không hợp lệ.' }, { status: 400 });
  }
  const requestedMonth = request.nextUrl.searchParams.get('month') ?? undefined;
  const { month, didFallback } = resolveVietnamMonth(requestedMonth);
  if (didFallback && requestedMonth !== undefined) {
    return NextResponse.json({ message: 'Tháng không hợp lệ.' }, { status: 400 });
  }
  try {
    const supabase = await createClient();
    const rows = await listMisaCustomerPlanTemplateRows(supabase, `${month}-01`, employeeId);
    if (rows.length === 0) return NextResponse.json({ message: 'Nhân viên chưa có khách hàng trong tháng này.' }, { status: 404 });
    const xlsx = await buildCustomerPlanXlsx(rows.map((row) => ({
      customerId: row.customerId,
      customerCode: row.customerCode,
      customerName: row.customerName,
      monthlyFrequency: row.monthlyFrequency ?? defaultMonthlyFrequency(getCustomerRevenueGroup(row.orderSales)),
      committedSales: row.committedSales,
    })));
    return new NextResponse(xlsx, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="ke-hoach-khach-hang-${employeeId}-${month}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('[customer-plan-template]', error);
    return NextResponse.json({ message: 'Không tạo được file mẫu.' }, { status: 500 });
  }
}
