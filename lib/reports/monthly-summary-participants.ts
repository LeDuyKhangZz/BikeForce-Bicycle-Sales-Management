export const MONTHLY_ACCOUNTING_PARTICIPANT = {
  id: 'salework-accounting-sales',
  full_name: 'Abraham Kế Toán Bánhàng',
  employee_code: 'VP-SA-001',
  is_active: true,
} as const;

/** Tài khoản tích hợp không phải user đăng nhập; không tạo profile/role giả. */
export function includeMonthlyAccountingParticipant<
  T extends { id: string; full_name: string; employee_code: string | null; is_active: boolean },
>(sales: readonly T[]) {
  return [
    ...sales.filter((person) => person.is_active),
    MONTHLY_ACCOUNTING_PARTICIPANT,
    ...sales.filter((person) => !person.is_active),
  ];
}
