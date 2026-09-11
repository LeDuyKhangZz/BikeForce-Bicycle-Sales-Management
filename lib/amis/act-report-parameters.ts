export type ActReportParameters = {
  readonly sessionKey?: string;
  readonly branchFilter?: string;
  readonly includeDependentBranch?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function actReportParametersFromBody(body: string | null): ActReportParameters {
  if (!body) return {};

  try {
    const requestBody: unknown = JSON.parse(body);
    if (!isRecord(requestBody) || typeof requestBody.parameters !== 'string') return {};

    const decoded: unknown = JSON.parse(
      Buffer.from(requestBody.parameters, 'base64').toString('utf8'),
    );
    if (!isRecord(decoded)) return {};

    return {
      ...(typeof decoded.p_session_key === 'string' && decoded.p_session_key.trim() !== ''
        ? { sessionKey: decoded.p_session_key }
        : {}),
      ...(typeof decoded.p_branch_id === 'string' && decoded.p_branch_id.trim() !== ''
        ? { branchFilter: decoded.p_branch_id }
        : {}),
      ...(typeof decoded.p_include_dependent_branch === 'boolean'
        ? { includeDependentBranch: decoded.p_include_dependent_branch }
        : {}),
    };
  } catch {
    return {};
  }
}
