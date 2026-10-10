import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/pancake-report.yml', 'utf8');

describe('workflow chạy tay Pancake', () => {
  it('không còn dùng scheduler GitHub không ổn định', () => {
    const scheduledCrons = [...workflow.matchAll(/^    - cron: '([^']+)'$/gm)].map((match) => match[1]);
    expect(scheduledCrons).toEqual([]);
    expect(workflow).toContain('workflow_dispatch:');
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
