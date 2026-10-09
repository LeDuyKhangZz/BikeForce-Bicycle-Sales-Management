import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/pancake-report.yml', 'utf8');

describe('lịch đồng bộ Pancake', () => {
  it('chạy lúc 09:00 và 17:00 giờ Việt Nam', () => {
    const scheduledCrons = [...workflow.matchAll(/^    - cron: '([^']+)'$/gm)].map((match) => match[1]);
    expect(scheduledCrons).toEqual(['0 2 * * *', '0 10 * * *']);
  });

  it('cả hai lượt dùng ngày hiện tại; chỉ lần chạy tay mới được chọn ngày khác', () => {
    expect(workflow).toContain("$reportDate = $vietnamNow.ToString('yyyy-MM-dd')");
    expect(workflow).not.toContain('AddDays(-1)');
    expect(workflow).toContain('$reportDate = $env:MANUAL_DATE');
  });
});
