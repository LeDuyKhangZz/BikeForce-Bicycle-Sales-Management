import { MONTHLY_ACCOUNTING_PARTICIPANT } from '@/lib/reports/monthly-summary-participants';

// Snapshot tích hợp riêng, không phải tên nhân viên hay tài khoản đăng nhập.
export const MONTHLY_ACCOUNTING_AUGUST_KEY = '__MONTHLY119__:2026-08:10:60';
export const MONTHLY_ACCOUNTING_AUGUST_RECEIVABLE_EMPLOYEE = 'Nguyễn Thị Như Quỳnh';

export function usesAccountingAugustReport119(participantId: string, month: string): boolean {
  return participantId === MONTHLY_ACCOUNTING_PARTICIPANT.id && month === '2026-08';
}

/** View FULL JOIN có thể trả snapshot kỹ thuật như một nhân viên chưa ánh xạ. */
export function excludeAccountingAugustSnapshot<T extends { full_name: string | null; period_month: string | null }>(rows: readonly T[]): T[] {
  return rows.filter(row => row.full_name !== MONTHLY_ACCOUNTING_AUGUST_KEY || row.period_month !== '2026-08-01');
}
