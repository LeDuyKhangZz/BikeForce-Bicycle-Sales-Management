import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/pancake-report.yml', 'utf8');

describe('lịch đồng bộ Pancake', () => {
  it('có lượt chính 09:00/17:00 và lượt dự phòng sau 10 phút', () => {
    const scheduledCrons = [...workflow.matchAll(/^    - cron: '([^']+)'$/gm)].map((match) => match[1]);
    expect(scheduledCrons).toEqual(['0 2 * * *', '10 2 * * *', '0 10 * * *', '10 10 * * *']);
  });

  it('cả hai lượt dùng ngày hiện tại; chỉ lần chạy tay mới được chọn ngày khác', () => {
    expect(workflow).toContain("$reportDate = $vietnamNow.ToString('yyyy-MM-dd')");
    expect(workflow).not.toContain('AddDays(-1)');
    expect(workflow).toContain('$reportDate = $env:MANUAL_DATE');
  });

  it('cảnh báo Telegram khi workflow thất bại', () => {
    expect(workflow).toContain("failure() && env.TELEGRAM_BOT_TOKEN != '' && env.TELEGRAM_CHAT_ID != ''");
    expect(workflow).toContain('Đồng bộ Pancake thất bại');
    expect(workflow).toContain('actions/runs/${{ github.run_id }}');
  });
});
