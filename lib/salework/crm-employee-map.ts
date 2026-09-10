const CRM_CALL_EMPLOYEE_CODE_BY_ACCOUNT: Readonly<Record<string, string>> = {
  'Abraham Kế Toán Bánhàng': 'VP-SA-001',
  'Giao - Kế Toán bán hàng': 'VP-TLS-003',
};

/** Nối chính xác tài khoản SaleWork với mã nhân viên của AMIS CRM Report 70. */
export function getCrmCallEmployeeCode(accountName: string): string | null {
  return CRM_CALL_EMPLOYEE_CODE_BY_ACCOUNT[accountName] ?? null;
}
