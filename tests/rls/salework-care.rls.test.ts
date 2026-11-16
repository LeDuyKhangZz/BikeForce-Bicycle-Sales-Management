import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getMisaCustomerAlertCounts } from '@/services/misa-customer-alerts';
import { syncSaleWorkCareEvents } from '@/services/salework-care-sync';
import { authAdmin, closePool, sql } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

vi.mock('server-only', () => ({}));
let fixture: RlsFixture;
let sourceCustomerId: string;
let canonicalCustomerId: string;
const CUSTOMER_CODE = 'CARE-SW-RLS-1611';
const EMPLOYEE_ID = 9161101;
const ACCOUNT_ID = '9991601';
const PEER_ID = '9991602';
let month: string;

function event(messageId: string) {
  return {
    account_id: ACCOUNT_ID, peer_id: PEER_ID, message_id: messageId,
    sales_name: 'RLS Sales A', occurred_at: `${fixture.today}T00:00:00+07:00`,
  };
}

beforeAll(async () => {
  fixture = await setUpRlsFixture();
  month = fixture.today.slice(0, 7);
  await sql('update public.profiles set amis_employee_name = $1 where id = $2', ['Care SW Sales A', fixture.ids.salesA]);
  const canonical = await sql<{ id: string }>(`insert into public.customers
    (source_system,source_id,customer_code,customer_name,assigned_sales_id)
    values ('MISA','CARE-SW-RLS-1611',$1,'Care canonical',$2) returning id`, [CUSTOMER_CODE, fixture.ids.salesA]);
  const source = await sql<{ id: string }>(`insert into public.customers
    (source_system,source_id,customer_name,zalo_account)
    values ('SALEWORK_ZALO',$1,'Care source',$2) returning id`, [`FRIEND:${ACCOUNT_ID}:${PEER_ID}`, ACCOUNT_ID]);
  const sourceRow = source.rows[0];
  const canonicalRow = canonical.rows[0];
  if (!sourceRow || !canonicalRow) throw new Error('Missing local fixture');
  sourceCustomerId = sourceRow.id;
  canonicalCustomerId = canonicalRow.id;
  await sql(`insert into public.misa_report119_employees
    (period_month,misa_employee_id,employee_name,customer_count) values ($1,$2,'Care SW Sales A',1)`, [`${month}-01`, EMPLOYEE_ID]);
  await sql(`insert into public.misa_report119_customers
    (period_month,misa_employee_id,misa_customer_id,customer_code,customer_name,last_visit_date)
    values ($1,$2,9161101,$3,'Care customer','2020-01-01')`, [`${month}-01`, EMPLOYEE_ID, CUSTOMER_CODE]);
});

afterAll(async () => {
  await sql('delete from public.care_logs where source_id like $1', [`ZALO:${ACCOUNT_ID}:%`]);
  await sql('delete from public.customer_identity_links where source_customer_id = $1', [sourceCustomerId]);
  await sql('delete from public.customers where id in ($1,$2)', [sourceCustomerId, canonicalCustomerId]);
  await sql('delete from public.misa_report119_employees where period_month=$1 and misa_employee_id=$2', [`${month}-01`, EMPLOYEE_ID]);
  await tearDownRlsFixture();
  await closePool();
});

describe('đồng bộ chăm sóc SaleWork với JWT thật', () => {
  it('lưu trên định danh nguồn nhưng chưa coi là chăm khách MISA khi chưa duyệt liên kết', async () => {
    const result = await syncSaleWorkCareEvents(authAdmin, [event('1')]);
    expect(result).toMatchObject({ received: 1, written: 1, unlinked: 1 });
    const care = await fixture.clients.admin.rpc('get_linked_salework_care_date', {
      p_customer_code: CUSTOMER_CODE, p_reference_date: fixture.today,
    });
    expect(care.error).toBeNull();
    expect(care.data).toBeNull();
  });

  it('chỉ sau liên kết được duyệt mới cập nhật số đếm, vẫn giữ ngày thăm gốc', async () => {
    await sql(`insert into public.customer_identity_links(source_customer_id,canonical_customer_id,linked_by)
      values ($1,$2,$3)`, [sourceCustomerId, canonicalCustomerId, fixture.ids.admin]);
    const snapshot = await fixture.clients.salesA.from('misa_customer_care_snapshot')
      .select('last_visit_date,last_care_date').eq('customer_code', CUSTOMER_CODE).single();
    expect(snapshot.error).toBeNull();
    expect(snapshot.data).toEqual({ last_visit_date: '2020-01-01', last_care_date: fixture.today });
    const counts = await getMisaCustomerAlertCounts(fixture.clients.salesA, month, EMPLOYEE_ID, '2026-01-01');
    expect(counts.care).toBe(0);
  });

  it('đồng bộ lại chuyển về canonical một lần, sau đó không tạo bản sao', async () => {
    expect((await syncSaleWorkCareEvents(authAdmin, [event('1')])).written).toBe(1);
    expect((await syncSaleWorkCareEvents(authAdmin, [event('1')])).written).toBe(0);
    const rows = await sql<{ count: string }>('select count(*) from public.care_logs where source_id=$1', [`ZALO:${ACCOUNT_ID}:${PEER_ID}:1`]);
    expect(rows.rows[0]?.count).toBe('1');
  });

  it('sale khác không đọc được snapshot hay ngày chăm sóc khách của A', async () => {
    const other = await fixture.clients.salesB.from('misa_customer_care_snapshot')
      .select('misa_customer_id').eq('customer_code', CUSTOMER_CODE);
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
    const date = await fixture.clients.salesB.rpc('get_linked_salework_care_date', {
      p_customer_code: CUSTOMER_CODE, p_reference_date: fixture.today,
    });
    expect(date.error).toBeNull();
    expect(date.data).toBeNull();
    const inactive = await fixture.clients.inactive.rpc('get_linked_salework_care_date', {
      p_customer_code: CUSTOMER_CODE, p_reference_date: fixture.today,
    });
    expect(inactive.data).toBeNull();
  });

  it('snapshot lịch sử không dùng tin nhắn xảy ra sau ngày tham chiếu', async () => {
    const past = await fixture.clients.admin.rpc('get_linked_salework_care_date', {
      p_customer_code: CUSTOMER_CODE, p_reference_date: '2020-01-01',
    });
    expect(past.error).toBeNull();
    expect(past.data).toBeNull();
  });

  it('không tự ghép sale hoặc khách khi định danh không khớp', async () => {
    const missingSales = await syncSaleWorkCareEvents(authAdmin, [{ ...event('2'), sales_name: 'Tên gần giống RLS Sales A' }]);
    expect(missingSales).toMatchObject({ written: 0, unmatched_sales: 1 });
    const missingCustomer = await syncSaleWorkCareEvents(authAdmin, [{ ...event('2'), peer_id: 'missing-peer' }]);
    expect(missingCustomer).toMatchObject({ written: 0, unmatched_customers: 1 });
  });

  it('anon và authenticated không được gọi RPC ghi; service_role không có quyền bảng trực tiếp', async () => {
    for (const client of [fixture.anon, fixture.clients.salesA, fixture.clients.admin]) {
      const result = await client.rpc('sync_salework_care_logs', { p_events: [event('3')] });
      expect(result.error).not.toBeNull();
    }
    const rows = await authAdmin.from('care_logs').select('id').range(0, 0);
    expect(rows.error).not.toBeNull();
    const anonRead = await fixture.anon.rpc('get_linked_salework_care_date', {
      p_customer_code: CUSTOMER_CODE, p_reference_date: fixture.today,
    });
    expect(anonRead.error).not.toBeNull();
  });

  it('payload lỗi bị từ chối nguyên tử, không ghi một phần', async () => {
    const invalid = await authAdmin.rpc('sync_salework_care_logs', {
      p_events: [event('bad-batch'), { ...event('bad-timestamp'), occurred_at: 'infinity' }],
    });
    expect(invalid.error).not.toBeNull();
    const rows = await sql<{ count: string }>('select count(*) from public.care_logs where source_id like $1', [`ZALO:${ACCOUNT_ID}:${PEER_ID}:bad-%`]);
    expect(rows.rows[0]?.count).toBe('0');
  });
});
