import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getLatestPancakeDailyReport,
  getLatestPancakeReportForImage,
} from '@/services/pancake-reports';

import { authAdmin, closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

const REPORT_DATE = '2035-10-08';
const SHOP_ID = 1022081353;

let fixture: RlsFixture;

beforeAll(async () => {
  fixture = await setUpRlsFixture();
  const { error } = await authAdmin.rpc('upsert_pancake_daily_report', {
    p_report_date: REPORT_DATE,
    p_shop_id: SHOP_ID,
    p_order_count: 10,
    p_revenue: 1_662_750,
    p_cancelled_count: 0,
    p_returned_count: 0,
    p_late_count: 0,
    p_ads_order_count: 0,
    p_ads_gmv: 0,
    p_sources: [
      { source_name: 'Shopee', order_count: 5, revenue: 1_144_875 },
      { source_name: 'Tiktok', order_count: 5, revenue: 517_875 },
    ],
  });
  if (error) throw error;
});

afterAll(async () => {
  await sql('delete from public.pancake_daily_reports where report_date = $1 and shop_id = $2', [
    REPORT_DATE,
    SHOP_ID,
  ]);
  await tearDownRlsFixture();
  await closePool();
});

describe('RLS báo cáo Pancake', () => {
  it('Admin đọc được báo cáo và chi tiết nguồn', async () => {
    const report = await getLatestPancakeDailyReport(fixture.clients.admin);

    expect(report?.daily.report_date).toBe(REPORT_DATE);
    expect(report?.daily.employee_name).toBe('Trần Minh Triết');
    expect(report?.daily.order_count).toBe(10);
    expect(report?.daily.revenue).toBe(1_662_750);
    expect(report?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source_name: 'Shopee', order_count: 5, revenue: 1_144_875 }),
        expect.objectContaining({ source_name: 'Tiktok', order_count: 5, revenue: 517_875 }),
      ]),
    );
  });

  it('Sales và anon không đọc được báo cáo', async () => {
    expect(await getLatestPancakeDailyReport(fixture.clients.salesA)).toBeNull();
    expect(await getLatestPancakeDailyReport(fixture.anon)).toBeNull();
  });

  it('service role không đọc bảng trực tiếp nhưng được gọi RPC', async () => {
    const { error: selectError } = await authAdmin
      .from('pancake_daily_reports')
      .select('report_date')
      .eq('report_date', REPORT_DATE);

    expect(selectError).not.toBeNull();

    const privileges = await sql<{
      service_select: boolean;
      service_insert: boolean;
      service_update: boolean;
      service_execute: boolean;
    }>(
      `select
        has_table_privilege('service_role', 'public.pancake_daily_reports', 'SELECT') as service_select,
        has_table_privilege('service_role', 'public.pancake_daily_reports', 'INSERT') as service_insert,
        has_table_privilege('service_role', 'public.pancake_daily_reports', 'UPDATE') as service_update,
        has_function_privilege(
          'service_role',
          'public.upsert_pancake_daily_report(date,bigint,integer,bigint,integer,integer,integer,integer,bigint,jsonb)',
          'EXECUTE'
        ) as service_execute`,
    );

    expect(privileges.rows[0]).toEqual({
      service_select: false,
      service_insert: false,
      service_update: false,
      service_execute: true,
    });
  });

  it('RPC ảnh chỉ cho service role đọc snapshot mới nhất', async () => {
    const report = await getLatestPancakeReportForImage(authAdmin);

    expect(report?.daily.report_date).toBe(REPORT_DATE);
    expect(report?.daily.employee_name).toBe('Trần Minh Triết');
    expect(report?.sources).toHaveLength(2);

    const privileges = await sql<{
      service_execute: boolean;
      anon_execute: boolean;
      authenticated_execute: boolean;
    }>(
      `select
        has_function_privilege('service_role', 'public.get_latest_pancake_report_image()', 'EXECUTE') as service_execute,
        has_function_privilege('anon', 'public.get_latest_pancake_report_image()', 'EXECUTE') as anon_execute,
        has_function_privilege('authenticated', 'public.get_latest_pancake_report_image()', 'EXECUTE') as authenticated_execute`,
    );

    expect(privileges.rows[0]).toEqual({
      service_execute: true,
      anon_execute: false,
      authenticated_execute: false,
    });
  });

  it('RPC từ chối khi tổng theo nguồn không khớp tổng ngày', async () => {
    const { error } = await authAdmin.rpc('upsert_pancake_daily_report', {
      p_report_date: '2035-10-09',
      p_shop_id: SHOP_ID,
      p_order_count: 10,
      p_revenue: 1_662_750,
      p_cancelled_count: 0,
      p_returned_count: 0,
      p_late_count: 0,
      p_ads_order_count: 0,
      p_ads_gmv: 0,
      p_sources: [{ source_name: 'Shopee', order_count: 9, revenue: 1_662_750 }],
    });

    expect(error?.message).toContain('source totals do not match');
  });
});
