import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authAdmin, closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

const CAPTURED_AT = '2026-11-03T08:15:00.000Z';
const BALANCE = 4_748_231;

let fixture: RlsFixture;

beforeAll(async () => {
  fixture = await setUpRlsFixture();
  const { error } = await authAdmin.rpc('insert_shopee_ad_balance_snapshot', {
    p_available_cash_balance: BALANCE,
    p_currency_code: 'VND',
    p_captured_at: CAPTURED_AT,
  });
  if (error) throw error;
});

afterAll(async () => {
  await sql('delete from public.shopee_ad_balance_snapshots where captured_at = $1', [CAPTURED_AT]);
  await tearDownRlsFixture();
  await closePool();
});

describe('RLS số dư quảng cáo Shopee', () => {
  it('Admin đọc được snapshot và báo cáo tổng hợp trả số dư Shopee mới nhất', async () => {
    const snapshot = await fixture.clients.admin
      .from('shopee_ad_balance_snapshots')
      .select('available_cash_balance,currency_code,captured_at')
      .eq('captured_at', CAPTURED_AT)
      .single();
    const summary = await fixture.clients.admin.rpc('get_marketplace_ad_finance_summary');

    expect(snapshot.error).toBeNull();
    expect(snapshot.data?.available_cash_balance).toBe(BALANCE);
    expect(snapshot.data?.currency_code).toBe('VND');
    expect(new Date(snapshot.data?.captured_at ?? '').toISOString()).toBe(CAPTURED_AT);
    expect(summary.error).toBeNull();
    expect(summary.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ marketplace_code: 'SHOPEE', available_balance: BALANCE }),
    ]));
  });

  it('Sales và anon không đọc được snapshot', async () => {
    const sales = await fixture.clients.salesA.from('shopee_ad_balance_snapshots').select('id');
    const anon = await fixture.anon.from('shopee_ad_balance_snapshots').select('id');

    expect(sales.error).toBeNull();
    expect(sales.data).toEqual([]);
    expect(anon.error).not.toBeNull();
  });

  it('service role chỉ gọi RPC, không có DML trực tiếp trên bảng', async () => {
    const privileges = await sql<{
      service_select: boolean;
      service_insert: boolean;
      service_execute: boolean;
    }>(
      `select
        has_table_privilege('service_role', 'public.shopee_ad_balance_snapshots', 'SELECT') as service_select,
        has_table_privilege('service_role', 'public.shopee_ad_balance_snapshots', 'INSERT') as service_insert,
        has_function_privilege(
          'service_role',
          'public.insert_shopee_ad_balance_snapshot(bigint,text,timestamptz)',
          'EXECUTE'
        ) as service_execute`,
    );

    expect(privileges.rows[0]).toEqual({
      service_select: false,
      service_insert: false,
      service_execute: true,
    });
  });
});
