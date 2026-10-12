import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('truy vấn snapshot Hạt Dẻ mới nhất — ISSUE-062', () => {
  it('ưu tiên thời điểm hệ thống nhận snapshot, không so giờ báo cáo giữa hai lượt đồng bộ', () => {
    const source = readFileSync(path.join(process.cwd(), 'services/hatde.ts'), 'utf8');
    const latestQuery = source.slice(
      source.indexOf('export async function getLatestHatdeSnapshot'),
      source.indexOf("const { data: snapshotData"),
    );

    expect(latestQuery).toContain(".order('created_at', { ascending: false })");
    expect(latestQuery).not.toContain(".order('report_time'");
  });
});
