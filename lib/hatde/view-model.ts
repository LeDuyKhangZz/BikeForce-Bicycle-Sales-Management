import { formatVietnamDate, isValidVietnamDate } from '@/lib/date';
import { formatHatdeComparison, formatHatdeRevenue, formatHatdeTransactions } from '@/lib/hatde/format';
import { getHatdeBranchName, isHatdeBranchCode } from '@/lib/hatde/branches';
import type { HatdeSnapshot } from '@/services/hatde';

export type HatdeComparisonViewModel = {
  value: number;
  display: string;
  direction: 'UP' | 'DOWN' | 'UNCHANGED';
};

export type HatdeBranchViewModel = {
  rank: number;
  code: string;
  name: string;
  revenueDisplay: string;
  transactionsDisplay: string;
  vsYesterday: HatdeComparisonViewModel;
  vsLastWeek: HatdeComparisonViewModel;
};

export type HatdeSnapshotViewModel = {
  id: string;
  reportDate: string;
  reportDateDisplay: string;
  reportTime: string;
  totalRevenueDisplay: string;
  totalTransactionsDisplay: string;
  branches: HatdeBranchViewModel[];
};

function comparison(value: number): HatdeComparisonViewModel {
  return {
    value,
    display: formatHatdeComparison(value),
    direction: value > 0 ? 'UP' : value < 0 ? 'DOWN' : 'UNCHANGED',
  };
}

export function buildHatdeSnapshotViewModel(report: HatdeSnapshot): HatdeSnapshotViewModel {
  return {
    id: report.snapshot.id,
    reportDate: report.snapshot.report_date,
    reportDateDisplay: formatVietnamDate(report.snapshot.report_date),
    reportTime: report.snapshot.report_time,
    totalRevenueDisplay: formatHatdeRevenue(report.snapshot.total_revenue),
    totalTransactionsDisplay: formatHatdeTransactions(report.snapshot.total_transactions),
    branches: report.branches.map((branch, index) => {
      if (!isHatdeBranchCode(branch.branch_code)) {
        throw new Error('Snapshot Hạt Dẻ chứa mã chi nhánh không hợp lệ.');
      }

      return {
        rank: index + 1,
        code: branch.branch_code,
        name: getHatdeBranchName(branch.branch_code),
        revenueDisplay: formatHatdeRevenue(branch.revenue),
        transactionsDisplay: formatHatdeTransactions(branch.transactions),
        vsYesterday: comparison(branch.vs_yesterday),
        vsLastWeek: comparison(branch.vs_last_week),
      };
    }),
  };
}

export function resolveHatdeDate(value: string | undefined): string | undefined {
  return value !== undefined && isValidVietnamDate(value) ? value : undefined;
}

export function resolveHatdeTime(value: string | undefined): string | undefined {
  return value !== undefined && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}
