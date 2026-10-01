export type IndependentSyncGroup = Readonly<{
  name: string;
  run: () => Promise<void>;
}>;

/**
 * Chạy tuần tự để không tranh chấp browser profile, nhưng một nguồn lỗi
 * không được chặn các nguồn độc lập phía sau.
 */
export async function runIndependentSyncGroups(
  groups: readonly IndependentSyncGroup[],
): Promise<string[]> {
  const errors: string[] = [];

  for (const group of groups) {
    try {
      await group.run();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'lỗi không xác định';
      errors.push(`${group.name}: ${message}`);
    }
  }

  return errors;
}
