/**
 * Chuỗi thông báo của luồng báo cáo — MỘT nguồn duy nhất.
 *
 * Nguồn: `docs/07-api-data-flow.md §6.2` (bảng mã lỗi ứng dụng). Mọi câu ở đây
 * là chuỗi AN TOÀN: không mã lỗi Postgres, không tên constraint, không tên bảng
 * (NFR-014). Chi tiết kỹ thuật chỉ đi vào `console.error` ở server.
 *
 * Đặt ở `lib/` chứ không ở `features/report-morning/` vì Phase 4 (báo cáo cuối
 * ngày) dùng lại đúng những câu này — `features/X` không được import
 * `features/Y` (AGENTS.md §1.2).
 */
export const REPORT_MESSAGES = {
  /** Lỗi validate — chi tiết nằm ở `fieldErrors` dưới từng ô. */
  VALIDATION: 'Vui lòng kiểm tra lại các ô đã nhập.',
  /** `role !== 'SALES'`. Admin không tạo báo cáo (DEC-030). */
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  /** BR-001 — `23505` trên `uq_daily_reports_sales_date`. */
  DUPLICATE_REPORT: 'Hôm nay bạn đã có báo cáo rồi. Hãy mở báo cáo hiện có.',
  /** BR-019 — đã `COMPLETED` thì khoá vĩnh viễn. */
  REPORT_LOCKED: 'Báo cáo đã hoàn tất nên không sửa được.',
  /** 0 dòng khớp: không tồn tại HOẶC không phải của mình — cố ý không phân biệt. */
  REPORT_NOT_FOUND: 'Không tìm thấy báo cáo.',
  /** BR-007 — chưa có cam kết sáng thì không có gì để hoàn tất. */
  NO_MORNING_REPORT: 'Chưa có báo cáo đầu ngày cho hôm nay.',
  /**
   * BR-019 — báo cáo đã `COMPLETED` rồi lại bấm Lưu lần nữa (hai tab, hoặc bấm
   * lại nút Back). Câu này khác `REPORT_LOCKED` ở chỗ nó nói về việc **hoàn
   * tất**, không phải việc sửa.
   */
  ALREADY_COMPLETED: 'Báo cáo hôm nay đã hoàn tất rồi.',
  /** BR-005, BR-016, BR-021 — chỉ đúng ngày hôm nay theo giờ VN. */
  WRONG_BUSINESS_DATE: 'Chỉ được tạo báo cáo cho ngày hôm nay.',
  /** Mất mạng / timeout. Form KHÔNG được reset (NFR-010). */
  SAVE_FAILED: 'Không lưu được. Kiểm tra kết nối rồi thử lại.',
  /*
   * ⚠ PHASE 14 — `NOT_COMPLETED` ("Chỉ xuất ảnh được sau khi hoàn tất báo cáo
   * cuối ngày.") ĐÃ BỊ XOÁ cùng chốt chặn sinh ra nó. **DEC-058** cho phép xuất
   * ảnh ngay sau cam kết sáng, nên không còn tình huống nào trả câu đó nữa.
   */
  /** Sinh ảnh 9:16 thất bại — chi tiết chỉ nằm ở log server (NFR-014). */
  IMAGE_FAILED: 'Không tạo được ảnh báo cáo. Vui lòng thử lại.',
  UNKNOWN: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
} as const;

/**
 * Thông báo thành công, hiển thị ở `/sales/today` sau khi quay về.
 *
 * ⚠ `MORNING_UPDATED` ("Đã cập nhật cam kết sáng.") đã bị XOÁ ở PHASE 14 cùng
 * UC-05 (DEC-055). Không còn đường nào trong ứng dụng sinh ra câu đó.
 */
export const REPORT_SAVED_NOTICES = {
  MORNING_CREATED: 'Đã lưu báo cáo đầu ngày.',
  EVENING_COMPLETED: 'Đã hoàn tất báo cáo hôm nay.',
} as const;

export type ReportSavedNotice = keyof typeof REPORT_SAVED_NOTICES;

/** Giá trị hợp lệ của query param `?saved=` trên `/sales/today`. */
export const SAVED_PARAM = {
  MORNING_CREATED: 'morning',
  EVENING_COMPLETED: 'evening',
} as const;

/**
 * Giá trị này do **Server Action** trả về, không do client tự suy ra (DEC-034).
 *
 * Lý do nằm ở một lỗi đã xảy ra thật khi kiểm chứng Phase 3: client suy thông
 * báo từ trạng thái form của chính nó thì đọc trúng trạng thái ĐÃ bị
 * `revalidatePath()` làm mới, và hiện nhầm câu xác nhận. Quy tắc giữ nguyên kể
 * cả khi PHASE 14 rút danh sách xuống còn hai giá trị: **server quyết định**.
 */
export type SavedParamValue = (typeof SAVED_PARAM)[keyof typeof SAVED_PARAM];

export function messageForSavedParam(value: string | undefined): string | null {
  if (value === SAVED_PARAM.MORNING_CREATED) return REPORT_SAVED_NOTICES.MORNING_CREATED;
  if (value === SAVED_PARAM.EVENING_COMPLETED) return REPORT_SAVED_NOTICES.EVENING_COMPLETED;
  return null;
}
