import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { getVietnamToday } from '../lib/date';
import { E2E_ADMIN_EMAIL } from './accounts';
import { loadE2eEnv } from './env';
import { signIn } from './helpers';

const pool = new Pool({ connectionString: loadE2eEnv().SUPABASE_DB_URL, max: 1 });
const today = getVietnamToday();
const month = `${today.slice(0, 7)}-01`;
const EMPLOYEE_ID = 9161126;

// Mỗi project có mã riêng để seed/cleanup không ảnh hưởng nhau khi chạy song song.
let customerCode: string;
let employeeId: number;

test.beforeAll(async ({}, info) => {
  const offset = info.project.name === 'mobile-375' ? 0 : info.project.name === 'desktop-1440' ? 1 : 2;
  employeeId = EMPLOYEE_ID + offset;
  customerCode = `E2E-SW-CARE-${offset}`;
  await pool.query(`insert into public.misa_report119_employees
    (period_month,misa_employee_id,employee_name,customer_count) values ($1,$2,'E2E chăm sóc SaleWork',2)`, [month, employeeId]);
  await pool.query(`insert into public.misa_report119_customers
    (period_month,misa_employee_id,misa_customer_id,customer_code,customer_name,last_visit_date)
    values ($1,$2,$2,$3,'Khách vừa chăm qua Zalo','2020-01-01'),
      ($1,$2,$2+100,'E2E-OLD-'||$3,'Khách đang cần chăm sóc','2020-01-01')`, [month, employeeId, customerCode]);
  await pool.query(`with customer as (
    insert into public.customers(source_system,source_id,customer_code,customer_name)
    values ('MISA',$1,$1,'E2E chăm sóc') returning id
  ) insert into public.care_logs(source_system,source_id,customer_id,channel,direction,occurred_at)
    select 'SALEWORK',$1,id,'ZALO','OUTBOUND',$2::timestamptz from customer`, [customerCode, `${today}T00:00:00+07:00`]);
});

test.afterAll(async () => {
  await pool.query('delete from public.care_logs where source_id=$1', [customerCode]);
  await pool.query('delete from public.customers where source_system=\'MISA\' and source_id=$1', [customerCode]);
  await pool.query('delete from public.misa_report119_employees where period_month=$1 and misa_employee_id=$2', [month, employeeId]);
  await pool.end();
});

test('ngày chăm sóc Zalo cập nhật số đếm và popup, không tràn ngang', async ({ page }) => {
  await signIn(page, E2E_ADMIN_EMAIL);
  await page.goto(`/admin/misa-employees/${employeeId}?month=${today.slice(0, 7)}`);
  const care = page.getByRole('button', { name: '1 khách: Từ 30 ngày chưa chăm sóc', exact: true });
  await expect(care).toBeVisible();
  const bounds = await care.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await care.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Khách đang cần chăm sóc', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Khách vừa chăm qua Zalo', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText('1 khách hàng', { exact: false })).toBeVisible();
});
