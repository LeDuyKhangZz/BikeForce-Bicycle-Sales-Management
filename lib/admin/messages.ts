/**
 * Chuỗi thông báo của quản lý tài khoản Sales — UC-17, UC-18, UC-19;
 * FR-030…FR-032.
 *
 * Cùng lý do với `lib/account/messages.ts`: một file `'use server'` **chỉ được
 * export async function**, nên hằng số phải nằm ở `lib/`. Chi tiết sự cố và
 * cách phát hiện: `docs/12 § ISSUE-016`.
 *
 * Câu chữ ở đây là thứ người dùng đọc khi thao tác hỏng, nên chúng phải nói
 * **việc cần làm**, không phải mã lỗi kỹ thuật (NFR-014). Mã lỗi thật chỉ đi
 * vào `console.error` phía server.
 */
export const SALES_ADMIN_MESSAGES = {
  CREATED: 'Đã tạo tài khoản. Hãy bàn giao mật khẩu tạm cho nhân viên qua kênh nội bộ.',
  UPDATED: 'Đã cập nhật hồ sơ nhân viên.',
  ACTIVATED: 'Đã mở lại quyền truy cập cho nhân viên.',
  DEACTIVATED: 'Đã vô hiệu hoá tài khoản. Nhân viên sẽ bị đăng xuất ở lần thao tác kế tiếp.',
  VALIDATION: 'Vui lòng kiểm tra lại thông tin.',
  DUPLICATE_EMAIL: 'Email này đã được dùng cho một tài khoản khác.',
  DUPLICATE_CODE: 'Mã nhân viên này đã được dùng cho một tài khoản khác.',
  WEAK_PASSWORD: 'Mật khẩu tạm chưa đủ mạnh. Hãy chọn mật khẩu dài hơn.',
  NOT_FOUND: 'Không tìm thấy nhân viên này.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  FAILED: 'Không thực hiện được lúc này. Vui lòng thử lại.',
} as const;

/**
 * Chuỗi của màn hình "Chỉ tiêu tháng" — DEC-071.
 *
 * Cùng lý do phải nằm ở `lib/`: `features/admin-targets/actions.ts` mang
 * `'use server'` nên không được export hằng số (ISSUE-016).
 */
export const MONTHLY_TARGET_MESSAGES = {
  SAVED: 'Đã lưu chỉ tiêu tháng.',
  VALIDATION: 'Vui lòng kiểm tra lại các ô được đánh dấu.',
  INVALID_MONTH: 'Tháng không hợp lệ.',
  NO_SALES: 'Chưa có nhân viên Sales nào để giao chỉ tiêu.',
  FORBIDDEN: 'Bạn không có quyền đặt chỉ tiêu.',
  FAILED: 'Không lưu được lúc này. Vui lòng thử lại.',
} as const;

export const TRAVEL_EXPENSE_MESSAGES = {
  SAVED: 'Đã lưu công tác phí tháng.',
  VALIDATION: 'Vui lòng kiểm tra lại các ô được đánh dấu.',
  INVALID_MONTH: 'Tháng không hợp lệ.',
  NO_SALES: 'Chưa có nhân viên Sales nào để nhập công tác phí.',
  FORBIDDEN: 'Bạn không có quyền nhập công tác phí.',
  FAILED: 'Không lưu được lúc này. Vui lòng thử lại.',
} as const;

export const SALARY_MESSAGES = {
  SAVED: 'Đã lưu lương tháng.',
  VALIDATION: 'Vui lòng kiểm tra lại các ô được đánh dấu.',
  INVALID_MONTH: 'Tháng không hợp lệ.',
  NO_SALES: 'Chưa có nhân viên Sales nào để nhập lương.',
  FORBIDDEN: 'Bạn không có quyền nhập lương.',
  FAILED: 'Không lưu được lúc này. Vui lòng thử lại.',
} as const;

export const MONTHLY_SYNC_MESSAGES = {
  QUEUED: 'Đã gửi yêu cầu đồng bộ tháng. Máy đồng bộ sẽ xử lý trong ít phút.',
  ALREADY_ACTIVE: 'Tháng này đã có một lượt đồng bộ đang chờ hoặc đang chạy.',
  INVALID_MONTH: 'Tháng cần đồng bộ không hợp lệ.',
  FORBIDDEN: 'Bạn không có quyền đồng bộ dữ liệu tháng.',
  FAILED: 'Không tạo được yêu cầu đồng bộ lúc này. Vui lòng thử lại.',
} as const;
