import { describe, expect, it } from 'vitest';

import { actReportParametersFromBody } from './act-report-parameters';

function requestBody(parameters: Record<string, unknown>): string {
  return JSON.stringify({
    parameters: Buffer.from(JSON.stringify(parameters), 'utf8').toString('base64'),
  });
}

describe('actReportParametersFromBody', () => {
  it('đọc cùng lúc session và bộ lọc chi nhánh từ request báo cáo thật', () => {
    expect(
      actReportParametersFromBody(
        requestBody({
          p_session_key: 'session-key',
          p_branch_id: 'branch-a,branch-b,',
          p_include_dependent_branch: true,
        }),
      ),
    ).toEqual({
      sessionKey: 'session-key',
      branchFilter: 'branch-a,branch-b,',
      includeDependentBranch: true,
    });
  });

  it('không đoán giá trị khi body hoặc base64 không hợp lệ', () => {
    expect(actReportParametersFromBody(null)).toEqual({});
    expect(actReportParametersFromBody('{')).toEqual({});
    expect(actReportParametersFromBody(JSON.stringify({ parameters: 'không-phải-json' }))).toEqual({});
  });
});
