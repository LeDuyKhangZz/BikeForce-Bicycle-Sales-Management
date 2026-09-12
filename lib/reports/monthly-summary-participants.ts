export const MONTHLY_ACCOUNTING_PARTICIPANT = {
  id: 'salework-accounting-sales',
  full_name: 'Abraham Kế Toán Bánhàng',
  employee_code: 'VP-SA-001',
  is_active: true,
} as const;

export const MONTHLY_KIM_HUONG_PARTICIPANT = {
  id: 'amis-kim-huong',
  full_name: 'Nguyễn Thị Kim Hương',
  employee_code: null,
  is_active: true,
} as const;

/** Nhân viên AMIS-only không cần tạo user Sales hay tài khoản SaleWork giả. */
export function includeMonthlySummaryParticipants<
  T extends { id: string; full_name: string; employee_code: string | null; is_active: boolean },
>(sales: readonly T[]) {
  const participants = includeMonthlyAccountingParticipant(sales);
  if (sales.some(person => person.id === MONTHLY_KIM_HUONG_PARTICIPANT.id || person.full_name.trim() === MONTHLY_KIM_HUONG_PARTICIPANT.full_name)) {
    return participants;
  }
  return [
    ...participants.filter(person => person.is_active),
    MONTHLY_KIM_HUONG_PARTICIPANT,
    ...participants.filter(person => !person.is_active),
  ];
}

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
