/**
 * Dựng URL của `/sales/history` — nguồn DUY NHẤT.
 *
 * Bộ lọc tháng và số trang sống trên **URL** chứ không trong state của React
 * (rule `deep-linking` + `state-preservation` của `docs/05 §11`): quay lại từ
 * màn hình chi tiết phải thấy đúng tháng và đúng trang đang xem, và một trang
 * lịch sử phải gửi được cho người khác qua link.
 *
 * Bốn nơi dựng URL này — bộ lọc tháng, thanh phân trang, empty state, và nút
 * quay lại của `/sales/reports/[id]`. Tự ghép chuỗi ở bốn chỗ là cách chắc chắn
 * để một chỗ quên `?month=` và âm thầm ném người dùng về tháng hiện tại.
 */
import { FIRST_PAGE } from '@/lib/reports/pagination';

export const SALES_HISTORY_PATH = '/sales/history';

/** Tên tham số trên URL — dùng chung với `searchParams` của page. */
export const HISTORY_PARAMS = {
  MONTH: 'month',
  PAGE: 'page',
} as const;

/**
 * `{ month: '2026-08', page: 2 }` → `'/sales/history?month=2026-08&page=2'`.
 *
 * `page = 1` được **lược bỏ** khỏi URL: đó là mặc định, và một `?page=1` thừa
 * làm hai URL khác nhau cùng trỏ một trang — phiền cho cả bookmark lẫn việc so
 * sánh `pathname` khi tô sáng nav.
 */
export function salesHistoryPath(params: { month?: string; page?: number } = {}): string {
  const search = new URLSearchParams();

  if (params.month) search.set(HISTORY_PARAMS.MONTH, params.month);
  if (params.page !== undefined && params.page > FIRST_PAGE) {
    search.set(HISTORY_PARAMS.PAGE, String(params.page));
  }

  const query = search.toString();

  return query === '' ? SALES_HISTORY_PATH : `${SALES_HISTORY_PATH}?${query}`;
}
