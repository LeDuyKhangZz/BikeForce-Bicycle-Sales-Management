/**
 * Thông báo dùng chung cho đồng bộ Đơn hàng & Tồn kho MISA trên giao diện Admin.
 * Đặt ở `lib/` theo AGENTS.md §9 và DEC-045 (không export object từ file `'use server'`).
 */

export const OPERATIONS_SYNC_MESSAGES = {
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Chỉ quản trị viên mới có quyền đồng bộ dữ liệu MISA.',
  VALIDATION_FAILED: 'Tham số đồng bộ không hợp lệ.',
  MISSING_CREDENTIALS:
    'Chưa cấu hình AMIS_CLIENT_ID hoặc AMIS_CLIENT_SECRET trên máy chủ.',
  ORDERS_SYNC_FAILED:
    'Không thể đồng bộ đơn hàng từ MISA lúc này. Vui lòng thử lại sau.',
  INVENTORY_SYNC_FAILED:
    'Không thể đồng bộ tồn kho từ MISA lúc này. Vui lòng thử lại sau.',
} as const;

