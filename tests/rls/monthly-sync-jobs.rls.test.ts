import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMonthlySyncJob, getLatestMonthlySyncJob } from '@/services/monthly-sync-jobs';

import { authAdmin, closePool } from '../integration/setup';
import { setUpRlsFixture, tearDownRlsFixture, type RlsFixture } from './setup';

let fixture: RlsFixture;
const PERIOD_MONTH = '2033-04-01';

beforeAll(async () => {
  fixture = await setUpRlsFixture();
});

afterAll(async () => {
  await tearDownRlsFixture();
  await closePool();
});

describe('RLS hàng đợi đồng bộ tháng', () => {
  it('Admin tạo và đọc được yêu cầu; không xếp trùng job đang hoạt động', async () => {
    expect(await createMonthlySyncJob(fixture.clients.admin, PERIOD_MONTH, fixture.ids.admin)).toBe('CREATED');
    expect(await createMonthlySyncJob(fixture.clients.admin, PERIOD_MONTH, fixture.ids.admin)).toBe('ACTIVE_EXISTS');
    expect((await getLatestMonthlySyncJob(fixture.clients.admin, PERIOD_MONTH))?.status).toBe('PENDING');
  });

  it('Sales và anon không đọc hoặc tạo được yêu cầu', async () => {
    expect(await getLatestMonthlySyncJob(fixture.clients.salesA, PERIOD_MONTH)).toBeNull();
    expect(await getLatestMonthlySyncJob(fixture.anon, PERIOD_MONTH)).toBeNull();
    expect(await createMonthlySyncJob(fixture.clients.salesA, '2033-05-01', fixture.ids.salesA)).toBe('FAILED');
  });

  it('worker service role được cập nhật trạng thái nhưng không được tạo job', async () => {
    const job = await getLatestMonthlySyncJob(fixture.clients.admin, PERIOD_MONTH);
    expect(job).not.toBeNull();
    const { error: updateError } = await authAdmin
      .from('monthly_sync_jobs')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString(), synced_rows: 8 })
      .eq('id', job?.id ?? '');
    expect(updateError).toBeNull();

    const { error: insertError } = await authAdmin.from('monthly_sync_jobs').insert({
      period_month: '2033-06-01',
      requested_by: fixture.ids.admin,
    });
    expect(insertError).not.toBeNull();
  });
});
