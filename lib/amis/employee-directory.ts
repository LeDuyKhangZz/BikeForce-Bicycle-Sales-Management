const HIDDEN_EMPLOYEE_NAMES = new Set(['Trần Minh Hải', 'Võ Trí Tính']);

/** Chỉ áp dụng cho danh sách Nhân viên; giữ nguyên dữ liệu đồng bộ MISA. */
export function isVisibleDirectoryEmployee(employee: { name: string }): boolean {
  return !HIDDEN_EMPLOYEE_NAMES.has(employee.name.normalize('NFC').trim());
}
