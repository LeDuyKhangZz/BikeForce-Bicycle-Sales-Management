import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration quyền đọc ảnh Hạt Dẻ', () => {
  it('chỉ cấp SELECT hai bảng cho service_role', () => {
    const sql = readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20261011140000_hatde_image_automation_read.sql'),
      'utf8',
    ).toLowerCase();

    expect(sql).toContain('grant select on public.hatde_snapshots to service_role');
    expect(sql).toContain('grant select on public.hatde_branch_snapshots to service_role');
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all)/);
  });
});
