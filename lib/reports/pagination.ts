/**
 * Số học phân trang — dưới dạng HÀM THUẦN, không biết gì về Supabase.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO TÁCH RA `lib/` CHỨ KHÔNG VIẾT THẲNG TRONG SERVICE
 * ─────────────────────────────────────────────────────────────────────────
 *  Ba chỗ sẽ cần đúng phép tính này: `/sales/history` (FR-021, Phase 7),
 *  `/admin/reports` (FR-025/FR-026, Phase 9) và `/admin/sales` (FR-029,
 *  Phase 10). Lệch `±1` ở `range()` là loại lỗi âm thầm nhất của phân trang —
 *  nó không ném lỗi, chỉ làm mất hoặc lặp đúng một dòng ở biên trang. Tách ra
 *  đây thì nó kiểm được bằng unit test không cần database (AGENTS.md §1.3).
 *
 *  `?page=` đến từ URL nên **luôn là chuỗi người dùng gõ được**. Mọi thứ ở đây
 *  phải chịu được `'abc'`, `'-5'`, `'1e9'` mà không sinh `NaN` hay số âm — một
 *  `.range()` với số âm làm PostgREST trả lỗi 416 và cả trang chết.
 */

/**
 * 20 dòng/trang theo `docs/07 §5` (`range(offset, offset + 19)`).
 *
 * Con số này phải bằng đúng số dòng mà truy vấn lấy về — đừng lấy nhiều rồi cắt
 * ở client, đó chính là thứ NFR-002 cấm.
 */
export const REPORTS_PAGE_SIZE = 20;

/** Trang đầu tiên là 1, không phải 0 — số này hiện trên URL cho người đọc. */
export const FIRST_PAGE = 1;

export type PageInfo = {
  /** Trang đang xem, đã kẹp vào khoảng hợp lệ `[1, pageCount]`. */
  page: number;
  /** Tổng số trang; **luôn ≥ 1** để câu "Trang 1/1" vẫn đọc được khi rỗng. */
  pageCount: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  /** Thứ tự dòng đầu/cuối của trang này trong toàn bộ tập, 1-based. `0` khi rỗng. */
  rangeStart: number;
  rangeEnd: number;
};

/**
 * `?page=` → số trang 1-based dùng được.
 *
 * Mọi đầu vào không dùng được (thiếu, rác, số âm, số thập phân, quá lớn) đều về
 * `1`. Cố ý KHÔNG ném lỗi và KHÔNG trả `null`: một URL bị sửa tay không đáng để
 * người dùng nhận trang lỗi, và "về trang đầu" là hành vi duy nhất không gây
 * hiểu nhầm.
 */
export function parsePageParam(raw: string | undefined): number {
  if (typeof raw !== 'string') return FIRST_PAGE;

  const parsed = Number(raw.trim());

  if (!Number.isSafeInteger(parsed) || parsed < FIRST_PAGE) return FIRST_PAGE;

  return parsed;
}

/**
 * Trang 1-based → cặp chỉ số 0-based **inclusive hai đầu** mà `.range()` của
 * PostgREST đòi hỏi: trang 1 với `pageSize = 20` là `[0, 19]`, không phải
 * `[0, 20]`.
 */
export function pageRange(
  page: number,
  pageSize: number = REPORTS_PAGE_SIZE,
): { from: number; to: number } {
  const safePage = Number.isSafeInteger(page) && page >= FIRST_PAGE ? page : FIRST_PAGE;
  const from = (safePage - 1) * pageSize;

  return { from, to: from + pageSize - 1 };
}

/**
 * Tổng số dòng + trang đang xem → mọi thứ giao diện cần để vẽ thanh phân trang.
 *
 * `page` được **kẹp** vào `[1, pageCount]` chứ không tin con số truyền vào: sau
 * khi đổi tháng, `?page=9` cũ có thể vượt quá số trang của tháng mới, và một
 * trang trống kèm nút "Sau" vẫn bấm được là trải nghiệm tệ hơn hẳn việc tự lùi
 * về trang cuối cùng có dữ liệu.
 */
export function buildPageInfo(
  total: number,
  page: number,
  pageSize: number = REPORTS_PAGE_SIZE,
): PageInfo {
  const safeTotal = Number.isSafeInteger(total) && total > 0 ? total : 0;
  // `pageCount` tối thiểu là 1: tập rỗng vẫn là "trang 1 trên 1", không phải
  // "trang 1 trên 0".
  const pageCount = Math.max(FIRST_PAGE, Math.ceil(safeTotal / pageSize));
  const safePage = Math.min(
    Math.max(Number.isSafeInteger(page) ? page : FIRST_PAGE, FIRST_PAGE),
    pageCount,
  );

  const rangeStart = safeTotal === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = safeTotal === 0 ? 0 : Math.min(safePage * pageSize, safeTotal);

  return {
    page: safePage,
    pageCount,
    total: safeTotal,
    hasPrev: safePage > FIRST_PAGE,
    hasNext: safePage < pageCount,
    rangeStart,
    rangeEnd,
  };
}
