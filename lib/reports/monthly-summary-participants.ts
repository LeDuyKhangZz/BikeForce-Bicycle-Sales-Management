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

export const MONTHLY_KHOA_PARTICIPANT = {
  id: 'amis-dang-khoa', full_name: 'Nguyễn Trần Đăng Khoa', employee_code: null, is_active: true,
} as const;

export const MONTHLY_SALARY_PARTICIPANTS = [MONTHLY_ACCOUNTING_PARTICIPANT, MONTHLY_KIM_HUONG_PARTICIPANT, MONTHLY_KHOA_PARTICIPANT] as const;

export function isMonthlySalaryParticipant(id: string): boolean {
  return MONTHLY_SALARY_PARTICIPANTS.some(person => person.id === id);
}

/** Nhân viên AMIS-only không cần tạo user Sales hay tài khoản SaleWork giả. */
export function includeMonthlySummaryParticipants<
  T extends { id: string; full_name: string; employee_code: string | null; is_active: boolean },
>(sales: readonly T[]) {
  const additions = MONTHLY_SALARY_PARTICIPANTS.filter(person => !sales.some(profile => profile.id === person.id || profile.full_name.trim() === person.full_name));
  return [
    ...sales.filter(person => person.is_active),
    ...additions,
    ...sales.filter(person => !person.is_active),
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
