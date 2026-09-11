/**
 * Ánh xạ tên hồ sơ Sales của BikeForce sang tên tài khoản Zalo trên SaleWork.
 *
 * Hai hệ thống không dùng cùng một tên hiển thị nên không được suy đoán bằng
 * cách tách họ tên hoặc tìm gần đúng. Tên chưa có trong danh sách trả về `null`.
 */
const SALES_SALEWORK_ACCOUNT_MAP: Readonly<Record<string, string>> = {
  'Ngô Thế San': 'Abraham San Miền Trung',
  'Nguyễn Minh Khải': 'Abraham Khải Hcm',
  'Nguyễn Trần Hoàn Thiện': 'Abraham Nguyễn Thiện',
  'Phan Thành Khải': 'Abraham Khải Khánh Hoà',
  'Tô Kim Sang': 'Abraham Sang Miền Tây',
  'Võ Trí Tính': 'Abraham Bà Rịa - Vũng Tàu',
  'Dương Văn Thịnh': 'Abraham Thịnh Miền Trung',
};

/**
 * SaleWork thêm tiền tố `(OFF)` vào tên hiển thị khi tài khoản đang nghỉ.
 * Đây chỉ là trạng thái tức thời, không phải một tài khoản khác, nên phải bỏ
 * tiền tố trước khi đối chiếu và lưu snapshot để không tạo hai dòng cho một người.
 */
export function normalizeSaleWorkAccountName(accountName: string): string {
  return accountName.trim().replace(/^\(OFF\)\s*/i, '').trim();
}

/** Danh sách tài khoản phải được script SaleWork chọn để dữ liệu luôn được đồng bộ. */
// Giữ nguyên tập đồng bộ NGÀY đã vận hành; Dương chỉ được thêm vào snapshot
// THÁNG theo yêu cầu, tránh thay đổi điều kiện đủ và dữ liệu báo cáo hằng ngày.
export const SALES_SALEWORK_ACCOUNT_NAMES: readonly string[] = [
  'Abraham San Miền Trung',
  'Abraham Khải Hcm',
  'Abraham Nguyễn Thiện',
  'Abraham Khải Khánh Hoà',
  'Abraham Sang Miền Tây',
  'Abraham Bà Rịa - Vũng Tàu',
];

/** Tập Sales cần snapshot tháng cho màn Tổng kết tháng. */
export const MONTHLY_SALEWORK_ACCOUNT_NAMES: readonly string[] = Object.values(
  SALES_SALEWORK_ACCOUNT_MAP,
);

export function getSaleWorkAccountName(salesFullName: string): string | null {
  return SALES_SALEWORK_ACCOUNT_MAP[salesFullName.trim()] ?? null;
}
