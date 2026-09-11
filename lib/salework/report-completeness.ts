type NamedReport = {
  readonly accountName: string;
};

/**
 * Trả báo cáo theo đúng thứ tự tài khoản cấu hình và từ chối toàn bộ mẻ nếu
 * thiếu một dòng. “Chưa đọc được” không bao giờ được suy thành hoạt động bằng 0.
 */
export function requireCompleteSaleWorkReports<T extends NamedReport>(
  targetAccountNames: readonly string[],
  reports: readonly T[],
): T[] {
  const reportsByAccountName = new Map(reports.map((report) => [report.accountName, report]));
  const missingAccountNames = targetAccountNames.filter(
    (accountName) => !reportsByAccountName.has(accountName),
  );

  if (missingAccountNames.length > 0) {
    throw new Error(`Thiếu dữ liệu SaleWork: ${missingAccountNames.join(', ')}`);
  }

  return targetAccountNames.map((accountName) => {
    const report = reportsByAccountName.get(accountName);
    if (report === undefined) {
      throw new Error(`Thiếu dữ liệu SaleWork: ${accountName}`);
    }
    return report;
  });
}

export function findStableCompleteSaleWorkReports<T extends NamedReport>(
  targetAccountNames: readonly string[],
  attempts: readonly (readonly T[])[],
): T[] | null {
  let previousCompleteReports: T[] | null = null;

  for (const reports of attempts) {
    let completeReports: T[];
    try {
      completeReports = requireCompleteSaleWorkReports(targetAccountNames, reports);
    } catch {
      previousCompleteReports = null;
      continue;
    }

    if (
      previousCompleteReports !== null &&
      JSON.stringify(previousCompleteReports) === JSON.stringify(completeReports)
    ) {
      return completeReports;
    }
    previousCompleteReports = completeReports;
  }

  return null;
}
