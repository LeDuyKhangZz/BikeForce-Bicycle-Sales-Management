import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMisaCustomerAlertCounts } from '@/services/misa-customer-alerts';
import { getPreviousMonthCustomerSales } from '@/services/misa-customer-previous-sales';
import { getCachedMisaEmployeeCustomers, getCachedMisaCustomerGroupCounts } from '@/services/misa-report119-cache';
import { closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

vi.mock('server-only', () => ({}));

let fixture: RlsFixture;
const MONTH = '2033-04';
const EMPLOYEE_A = 9033101;
const EMPLOYEE_B = 9033102;
const CUTOFF = '2033-03-31';

beforeAll(async () => {
  fixture = await setUpRlsFixture();
  await sql('update public.profiles set amis_employee_name = $1 where id = $2', ['Alert Sales A', fixture.ids.salesA]);
  await sql('update public.profiles set amis_employee_name = $1 where id = $2', ['Alert Sales B', fixture.ids.salesB]);
  await sql(`insert into public.misa_report119_employees (period_month,misa_employee_id,employee_name,customer_count)
    values ('2033-04-01',$1,'Alert Sales A',12),('2033-04-01',$2,'Alert Sales B',12)`, [EMPLOYEE_A, EMPLOYEE_B]);
  await sql(`insert into public.misa_report119_employees (period_month,misa_employee_id,employee_name,customer_count)
    values ('2033-03-01',$1,'Alert Sales A',1),('2033-03-01',$2,'Alert Sales B',1)`, [EMPLOYEE_A, EMPLOYEE_B]);
  await sql(`insert into public.misa_report119_customers (period_month,misa_employee_id,misa_customer_id,order_sales)
    values ('2033-03-01',$1,1,50000000),('2033-03-01',$2,1,90000000)`, [EMPLOYEE_A, EMPLOYEE_B]);
  for (const employee of [EMPLOYEE_A, EMPLOYEE_B]) {
    await sql(`insert into public.misa_report119_customers
      (period_month,misa_employee_id,misa_customer_id,customer_name,days_without_purchase,last_visit_date)
      select '2033-04-01',$1,n,'Alert Customer ' || n,30,null from generate_series(1,12) n`, [employee]);
  }
});

afterAll(async () => {
  await sql("delete from public.misa_report119_employees where period_month in ('2033-03-01','2033-04-01') and misa_employee_id in ($1,$2)", [EMPLOYEE_A, EMPLOYEE_B]);
  await tearDownRlsFixture();
  await closePool();
});

describe('cảnh báo khách hàng chịu RLS với JWT thật', () => {
  it('doanh số tháng trước không vượt RLS hoặc lẫn nhân viên khi cùng ID khách', async () => {
    expect((await getPreviousMonthCustomerSales(fixture.clients.salesA, MONTH, EMPLOYEE_A, [1])).get(1)).toBe(50000000);
    expect((await getPreviousMonthCustomerSales(fixture.clients.salesA, MONTH, EMPLOYEE_B, [1])).size).toBe(0);
    expect((await getPreviousMonthCustomerSales(fixture.clients.admin, MONTH, EMPLOYEE_B, [1])).get(1)).toBe(90000000);
  });
  it('Sales đếm đủ 12 khách của mình và trang 2 còn 2 khách', async () => {
    expect(await getMisaCustomerAlertCounts(fixture.clients.salesA, MONTH, EMPLOYEE_A, CUTOFF)).toEqual({ purchase: 12, care: 12 });
    const result = await getCachedMisaEmployeeCustomers(fixture.clients.salesA, {
      month: MONTH, employeeId: EMPLOYEE_A, page: 2, filters: {}, searchQuery: '', alert: 'care', alertCutoff: CUTOFF,
    });
    expect(result?.total).toBe(12);
    expect(result?.rows).toHaveLength(2);
  });

  it('Sales không đọc được số đếm hay danh sách của người khác', async () => {
    expect(await getMisaCustomerAlertCounts(fixture.clients.salesA, MONTH, EMPLOYEE_B, CUTOFF)).toEqual({ purchase: 0, care: 0 });
    expect(await getCachedMisaEmployeeCustomers(fixture.clients.salesA, {
      month: MONTH, employeeId: EMPLOYEE_B, page: 1, filters: {}, searchQuery: '', alert: 'purchase', alertCutoff: CUTOFF,
    })).toBeNull();
  });

  it('Admin đọc được cả hai nhân viên', async () => {
    for (const id of [EMPLOYEE_A, EMPLOYEE_B]) {
      expect(await getMisaCustomerAlertCounts(fixture.clients.admin, MONTH, id, CUTOFF)).toEqual({ purchase: 12, care: 12 });
    }
  });

  it('lọc nhóm D và số đếm vẫn chỉ thấy khách hàng Sales được phép đọc', async () => {
    expect(await getCachedMisaCustomerGroupCounts(fixture.clients.salesA, MONTH, EMPLOYEE_A)).toEqual({ A: 0, B: 0, C: 0, D: 12 });
    expect(await getCachedMisaCustomerGroupCounts(fixture.clients.salesA, MONTH, EMPLOYEE_B)).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    const result = await getCachedMisaEmployeeCustomers(fixture.clients.salesA, {
      month: MONTH, employeeId: EMPLOYEE_A, page: 2, filters: {}, searchQuery: '', group: 'D',
    });
    expect(result?.total).toBe(12);
    expect(result?.rows).toHaveLength(2);
  });
});
