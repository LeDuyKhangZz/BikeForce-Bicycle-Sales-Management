import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20261010031500_pancake_edge_cron.sql',
  'utf8',
);

describe('Supabase Cron cho Pancake', () => {
  it('chạy đúng 09:00 và 17:00 giờ Việt Nam', () => {
    expect(migration).toContain("'pancake-sync-09-vn',\n  '0 2 * * *'");
    expect(migration).toContain("'pancake-sync-17-vn',\n  '0 10 * * *'");
  });

  it('đọc URL và service key từ Vault, không hardcode secret', () => {
    expect(migration).toContain("name = 'bikeforce_project_url'");
    expect(migration).toContain("name = 'bikeforce_service_role_key'");
    expect(migration).not.toContain('eyJ');
    expect(migration).not.toContain('sb_secret_');
  });
});
