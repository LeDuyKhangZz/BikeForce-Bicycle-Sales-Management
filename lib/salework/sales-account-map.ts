/**
 * Ánh xạ tên hồ sơ Sales của BikeForce sang tên tài khoản Zalo trên SaleWork.
 *
 * Hai hệ thống không dùng cùng một tên hiển thị nên không được suy đoán bằng
 * cách tách họ tên hoặc tìm gần đúng. Tên chưa có trong danh sách trả về `null`.
 */
const SALES_SALEWORK_ACCOUNT_MAP: Readonly<Record<string, string>> = {
  'Ngô Thế San': 'Abraham San Miền Trung',
  'Nguyễn Trần Hoàn Thiện': 'Abraham Nguyễn Thiện',
  'Phan Thành Khải': 'Abraham Khải Khánh Hoà',
  'Tô Kim Sang': 'Abraham Sang Miền Tây',
  'Võ Trí Tính': 'Abraham Bà Rịa - Vũng Tàu',
};

/** Danh sách tài khoản phải được script SaleWork chọn để dữ liệu luôn được đồng bộ. */
export const SALES_SALEWORK_ACCOUNT_NAMES: readonly string[] = Object.values(
  SALES_SALEWORK_ACCOUNT_MAP,
);

export function getSaleWorkAccountName(salesFullName: string): string | null {
  return SALES_SALEWORK_ACCOUNT_MAP[salesFullName.trim()] ?? null;
}
