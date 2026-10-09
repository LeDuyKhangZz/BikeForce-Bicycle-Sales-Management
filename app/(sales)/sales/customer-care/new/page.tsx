import type { Metadata } from 'next';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { buttonClassName } from '@/components/ui/button';
import { requireRole } from '@/features/auth/queries';
import { CustomerCareForm } from '@/features/customer-care/customer-care-form';
import { getVietnamToday } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { getOwnedCareCustomer } from '@/services/customer-care';

export const metadata: Metadata = { title: 'Gửi minh chứng chăm sóc · BikeForce' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewCustomerCarePage({ searchParams }: Props) {
  await requireRole('SALES');
  const search = await searchParams;
  const periodMonth = typeof search.month === 'string' ? `${search.month}-01` : '';
  const employeeId = typeof search.employee === 'string' ? Number(search.employee) : 0;
  const customerId = typeof search.customer === 'string' ? Number(search.customer) : 0;
  const supabase = await createClient();
  const customer = periodMonth && Number.isSafeInteger(employeeId) && Number.isSafeInteger(customerId)
    ? await getOwnedCareCustomer(supabase, { periodMonth, employeeId, customerId })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div><h1 className="text-2xl font-bold text-heading">Gửi minh chứng chăm sóc</h1><p className="mt-1 text-sm text-muted-foreground">Ảnh được lưu riêng tư trên Cloudinary và chờ Admin phê duyệt.</p></div>
      <Card className="p-5">
        {customer ? <CustomerCareForm periodMonth={customer.period_month} employeeId={customer.misa_employee_id} customerId={customer.misa_customer_id} customerName={customer.customer_name} today={getVietnamToday()} /> : <p role="alert" className="text-sm text-destructive">Không tìm thấy khách hàng thuộc phạm vi của bạn.</p>}
      </Card>
      <Link href="/sales/customers" className={buttonClassName({ variant: 'secondary' })}>Quay lại khách hàng</Link>
    </div>
  );
}
