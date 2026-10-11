import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261011130000_allow_zero_hatde_branches.sql'),
  'utf8',
);

describe('migration cho chi nhánh Hạt Dẻ 0 đồng', () => {
  it('cho phép số 0 nhưng vẫn giữ biên 1-6, allowlist và kiểm tra tổng', () => {
    expect(migration).toContain('create or replace function public.upsert_hatde_snapshot');
    expect(migration).toContain('jsonb_array_length(p_branches) < 1');
    expect(migration).toContain('jsonb_array_length(p_branches) > 6');
    expect(migration).toContain('and x.revenue >= 0');
    expect(migration).toContain('and x.transactions >= 0');
    expect(migration).not.toContain('not (x.revenue = 0 and x.transactions = 0)');
    expect(migration).toContain('branch_revenue <> p_total_revenue');
    expect(migration).toContain('count(distinct x.branch_code)');
  });
});
