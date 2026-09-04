type PreviewCandidate = {
  readonly daily_reports: readonly { readonly report_date: string }[];
};

export type SalesPreviewGroups<T> = {
  readonly reportedToday: T[];
  readonly others: T[];
};

/** Ưu tiên người có báo cáo đúng ngày nghiệp vụ, giữ nguyên thứ tự tên trong mỗi nhóm. */
export function groupSalesPreviewsByToday<T extends PreviewCandidate>(
  sales: readonly T[],
  today: string,
): SalesPreviewGroups<T> {
  const reportedToday: T[] = [];
  const others: T[] = [];

  for (const employee of sales) {
    if (employee.daily_reports[0]?.report_date === today) reportedToday.push(employee);
    else others.push(employee);
  }

  return { reportedToday, others };
}
