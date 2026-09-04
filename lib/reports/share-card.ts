/**
 * View model THUẦN của thẻ ảnh chia sẻ 9:16 — FR-018, `docs/05 §14`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CÓ FILE NÀY THAY VÌ TÍNH THẲNG TRONG COMPONENT
 * ─────────────────────────────────────────────────────────────────────────
 *  1. AGENTS.md §1.3 — component không được chứa business logic. Thẻ ảnh cũng
 *     là component, không có ngoại lệ.
 *  2. Satori **không có `-webkit-line-clamp`** (ISSUE-002). Việc cắt tuyến ở 2
 *     dòng và ghi chú ở 4 dòng vì vậy phải làm ở TẦNG DỮ LIỆU, trước khi render.
 *  3. Toàn bộ edge case bắt buộc của Phase 6 (tên 40+ ký tự, tuyến 300 ký tự,
 *     ghi chú 1000 ký tự, doanh thu 12 chữ số, achievement 4 chữ số, hai nhánh
 *     `target = 0`) kiểm được bằng unit test không cần render ảnh, không cần
 *     trình duyệt, không cần database.
 *
 *  Mọi con số đi qua `lib/kpi.ts` — file này KHÔNG tự tính `%` và KHÔNG tự ghép
 *  đơn vị (NFR-012, DEC-038).
 */
import {
  calculateAchievement,
  calculateAverageOrderValue,
  formatMetricValueCompact,
  type AchievementResult,
} from '@/lib/kpi';
import { formatThousands } from '@/lib/currency';
import {
  formatVietnamDate,
  formatVietnamShortDate,
  getVietnamMonthToDateRange,
  shiftVietnamDate,
  type MonthToDateRange,
} from '@/lib/date';
import { KPI_METRIC_ROWS, type KpiMetricSource } from '@/lib/reports/metric-rows';
import type { Database } from '@/types/database.types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ReportStatus = Database['public']['Enums']['report_status'];

/** Tên chỉ tiêu như `lib/kpi.ts` khai — lấy qua chữ ký hàm để không gõ lại union. */
type KpiMetricName = Parameters<typeof calculateAchievement>[2];

/**
 * Số ký tự tối đa của tuyến trước khi cắt — tương đương **2 dòng** ở cỡ chữ
 * 32px trên khung rộng 984px (1080 trừ hai lề 48px). Ước lượng theo bề rộng
 * trung bình ~0,52em của Inter rồi trừ biên an toàn, vì Satori không cắt hộ.
 */
export const MAX_SHARE_ROUTE_CHARS = 104;

/**
 * Số ký tự ghi chú cho **một dòng** ở cỡ chữ 32px trên khung rộng 968px.
 * Cùng cách ước lượng ~0,52em như `MAX_SHARE_ROUTE_CHARS`.
 */
const NOTE_CHARS_PER_LINE = 62;

/** Số dòng ghi chú tối đa khi phần đầu thẻ ở trạng thái GỌN NHẤT. */
const NOTE_MAX_LINES = 2;

/** Trần tuyệt đối của ghi chú — 2 dòng. Giữ export vì test và docs tham chiếu. */
export const MAX_SHARE_NOTE_CHARS = NOTE_CHARS_PER_LINE * NOTE_MAX_LINES;

/**
 * Ngưỡng ký tự vừa **một dòng** ở cỡ chữ chuẩn.
 *
 * ⚠ **Hai con số này đã được HIỆU CHỈNH ngày 2026-08-16 bằng cách render PNG
 * thật rồi đếm.** Giá trị cũ (26 và 52) là ước lượng ~0,52em và **cả hai đều
 * lạc quan hơn thực tế**: tên `NGUYỄN THỊ HOÀNG PHƯƠNG THẢO` (28 ký tự) xuống 2
 * dòng ngay, còn tuyến 104 ký tự — đúng bằng `MAX_SHARE_ROUTE_CHARS`, tức lẽ ra
 * vừa 2 dòng — lại rớt xuống **3 dòng**. Đừng nâng lại theo lý thuyết em-width;
 * muốn đổi thì render ra và đếm.
 */
const NAME_CHARS_PER_LINE = 22;
const ROUTE_CHARS_PER_LINE = 46;

/**
 * Sức chứa dùng để TÍNH MỨC THU, thấp hơn ngưỡng "vẫn vừa" ở trên.
 *
 * ⚠ **Hai con số này cố ý KHÁC NHAU, đừng gộp lại.** Ngưỡng trên trả lời *"có
 * cần thu không"*; con số này trả lời *"thu bao nhiêu thì chắc chắn vừa"*. Gộp
 * làm một thì hoặc thu oan tên vẫn vừa, hoặc thu chưa đủ và tên vẫn xuống dòng —
 * đã dính đúng cả hai lỗi đó trong một buổi chiều.
 *
 * Vì sao phải chừa biên: đếm ký tự chỉ là xấp xỉ. `NGUYỄN THỊ HOÀNG PHƯƠNG THẢO`
 * (28 ký tự) ở 54px **vẫn xuống dòng**, tức sức chứa thật của chuỗi đó chỉ
 * ~20 ký tự quy về 64px, trong khi chuỗi khác cùng độ dài lại vừa. Lấy mức hẹp
 * nhất từng đo được.
 */
const NAME_FIT_CHARS = 20;
const ROUTE_FIT_CHARS = 44;

/* ---------------------------------------------------------------------------
 * CỠ CHỮ CO THEO ĐỘ DÀI — PHASE 19, người dùng chốt 2026-08-16
 *
 * *"làm sao để tên của sales chỉ xuất hiện trên 1 dòng thôi, ví dụ tên người đó
 * quá dài thì giảm size chữ xuống để tên xuất hiện 1 dòng thôi"*
 *
 * Vì sao đây là cách đúng: thẻ cao CỐ ĐỊNH 1920px, nên mỗi dòng phát sinh ở phần
 * đầu thẻ là một khoản chi mà khối khác phải trả — và khối trả tiền là ghi chú
 * rồi tới chân thẻ, rồi tới chính số liệu (đã render ra và thấy tận mắt). Thu cỡ
 * chữ giữ được TOÀN BỘ nội dung; cắt cụt tên người trên tấm ảnh gửi cấp trên thì
 * không.
 * ------------------------------------------------------------------------- */

/** Cỡ chữ tên Sales ở ca thường — vẫn là thứ đọc được đầu tiên trên thẻ. */
export const SHARE_NAME_FONT_SIZE = 64;

/**
 * Sàn cỡ chữ tên. Dưới mức này tên thôi giữ vai trò tiêu đề của tấm ảnh.
 *
 * 30px vẫn to hơn dòng ngày (36px thì tương đương) và đủ cho tên **42 ký tự** —
 * dài hơn mọi họ tên tiếng Việt thực tế, kể cả họ kép bốn chữ.
 */
export const SHARE_NAME_MIN_FONT_SIZE = 30;

/** Cỡ chữ tuyến ở ca thường. */
export const SHARE_ROUTE_FONT_SIZE = 34;

/** Sàn cỡ chữ tuyến — tuyến là dòng phụ nên chịu được nhỏ hơn tên. */
export const SHARE_ROUTE_MIN_FONT_SIZE = 24;

/**
 * Thu cỡ chữ tuyến tính theo tỉ lệ vượt: `n` ký tự cần vừa `perLine × maxLines`
 * chỗ, mà bề rộng chữ tỉ lệ thuận với cỡ chữ ⇒ nhân cỡ chữ với đúng tỉ lệ đó.
 *
 * `Math.floor` chứ không `round`: làm tròn lên là chấp nhận rủi ro tràn thêm một
 * dòng, mà một dòng thừa ở đây làm gãy cả tấm ảnh.
 */
function fitFontSize(
  text: string,
  base: number,
  min: number,
  noShrinkChars: number,
  fitChars: number,
): number {
  const length = text.trim().length;

  // CHỈ thu khi thật sự cần — người dùng dặn thẳng: *"chỉ giảm cỡ chữ khi tên
  // quá dài khiến tên bị xuống dòng"*. Chuỗi vừa một dòng ra khỏi đây với cỡ
  // chữ gốc, không suy suyển một pixel.
  if (length <= noShrinkChars) return base;

  return Math.max(min, Math.floor((base * fitChars) / length));
}

/**
 * Cỡ chữ tên Sales sao cho tên nằm gọn **một dòng**.
 *
 * Nhận chuỗi ĐÃ IN HOA — đó là chuỗi thật sự được vẽ, và chữ hoa rộng hơn chữ
 * thường nên đo trên chuỗi gốc là đo sai.
 *
 * Tên từ **22 ký tự trở xuống giữ nguyên 64px**, và đó là đa số tuyệt đối họ tên
 * tiếng Việt — trong thực tế hàm này gần như không bao giờ đụng tới cỡ chữ.
 */
export function shareNameFontSize(upperCaseName: string): number {
  return fitFontSize(
    upperCaseName,
    SHARE_NAME_FONT_SIZE,
    SHARE_NAME_MIN_FONT_SIZE,
    NAME_CHARS_PER_LINE,
    NAME_FIT_CHARS,
  );
}

/**
 * Cỡ chữ tuyến sao cho tuyến không quá **hai dòng**.
 *
 * Không ép về 1 dòng như tên: tuyến 104 ký tự mà nhét một dòng thì cỡ chữ rơi
 * xuống ~15px, nhỏ hơn cả chữ chân thẻ. Hai dòng là mức `docs/05 §14` vẫn vẽ.
 */
export function shareRouteFontSize(routeText: string | null): number {
  if (routeText === null) return SHARE_ROUTE_FONT_SIZE;

  return fitFontSize(
    routeText,
    SHARE_ROUTE_FONT_SIZE,
    SHARE_ROUTE_MIN_FONT_SIZE,
    ROUTE_CHARS_PER_LINE * 2,
    ROUTE_FIT_CHARS * 2,
  );
}

/**
 * Ngân sách ghi chú **động** — PHASE 18, DEC-069.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHÔNG THỂ ĐẶT MỘT CON SỐ CỐ ĐỊNH
 * ─────────────────────────────────────────────────────────────────────────
 *  Thẻ cao **cố định 1920px** nhưng phần đầu thì không: tên Sales dài xuống 2
 *  dòng ăn thêm ~77px, tuyến 2 dòng ăn thêm ~48px. Một hằng số `MAX_NOTE` dùng
 *  chung cho mọi ca vì thế **luôn sai một trong hai chiều** — hoặc phí chỗ ở ca
 *  gọn, hoặc tràn ở ca dài.
 *
 *  Đã trả giá thật để biết điều này: PHASE 17 hạ hằng số 232 → 174, PHASE 18 hạ
 *  tiếp 174 → 130, mà ca xấu nhất **vẫn bị chém ngang** giữa dòng chữ ghi chú.
 *  Cắt dần một hằng số không bao giờ tới đích, vì thứ thiếu là chỗ, và chỗ thì
 *  phụ thuộc dữ liệu.
 *
 *  Trả `0` nghĩa là **bỏ hẳn khối ghi chú**. Đó là lựa chọn có chủ đích: ghi chú
 *  là thông tin ít quan trọng nhất trên thẻ, và một khối bị chém ngang trông
 *  như ảnh lỗi — tệ hơn hẳn việc không có nó.
 *
 * ⚠ **PHASE 19 — TÊN KHÔNG CÒN TỐN DÒNG PHỤ.** `shareNameFontSize()` ép tên về
 * đúng **một dòng** bằng cách thu cỡ chữ, nên vế `nameLines` cũ đã bị bỏ khỏi
 * công thức này. Đừng thêm lại: giữ nó là trừ hai lần cho một khoản chi không
 * còn tồn tại, và ghi chú bị cắt oan ở mọi Sales có tên dài.
 *
 * Tuyến thì vẫn tốn: `shareRouteFontSize()` chỉ ép nó **không quá hai dòng**,
 * chứ không về một dòng — tuyến 104 ký tự nhét một dòng thì cỡ chữ còn ~15px.
 */
export function shareNoteBudget(
  fullName: string,
  routeText: string | null,
  hasPerformance = false,
): number {
  void fullName;

  // Cụm "Tình trạng thực hiện" cao ~200px — bằng đúng cả khối ghi chú kể cả
  // nhãn. Hai thứ KHÔNG cùng nằm vừa trong 1920px, đã render ra và thấy: giữ cả
  // hai thì ghi chú bị Yoga nén còn một mẩu nhãn "GHI CHÚ" thò ra rồi bị chém
  // ngang — trông hỏng hơn hẳn việc không có ghi chú.
  if (hasPerformance) return 0;

  const routeLines =
    routeText === null
      ? 0
      : Math.min(2, Math.max(1, Math.ceil(routeText.length / ROUTE_CHARS_PER_LINE)));

  // Ca chuẩn: tuyến 1 dòng. Dòng tuyến thứ hai ăn mất đúng một dòng ghi chú.
  const extraLines = Math.max(0, routeLines - 1);

  return Math.max(0, NOTE_MAX_LINES - extraLines) * NOTE_CHARS_PER_LINE;
}

/** Dấu báo "còn nữa" — cùng ký tự `…` mà font nhúng đã xác nhận có glyph. */
const ELLIPSIS = '…';

/**
 * HAI biến thể của tấm ảnh 9:16 — PHASE 14, **DEC-058**.
 *
 * Người dùng gửi Zalo **hai lần mỗi ngày**: sáng gửi lời cam kết, chiều gửi kết
 * quả. Đó là hai tấm ảnh khác nhau về nội dung, không phải một tấm chụp hai lần:
 *
 * | | `MORNING` | `EVENING` |
 * |---|---|---|
 * | Điều kiện | `status = 'MORNING_SUBMITTED'` | `status = 'COMPLETED'` |
 * | Bảng | 2 cột (chỉ tiêu · cam kết) | 4 cột, có `%` hoàn thành |
 * | Ghi chú cuối ngày | *(chưa tồn tại)* | có nếu Sales nhập |
 */
export type ShareCardVariant = 'MORNING' | 'EVENING';

/** Chữ in trên đầu thẻ, ngay dưới tên thương hiệu. */
const VARIANT_KIND_LABEL: Record<ShareCardVariant, string> = {
  MORNING: 'CAM KẾT ĐẦU NGÀY',
  EVENING: 'KẾT QUẢ CUỐI NGÀY',
};

/**
 * Nhãn nút bấm — **từ vựng nghiệp vụ**, nên ở `lib/` chứ không ở component.
 * `/sales/today` và `/sales/reports/[id]` cùng đọc bảng này (AGENTS.md §9).
 *
 * ⚠ **PHASE 14 (DEC-064) — bảng này KHÔNG còn dùng cho nút nào.** Giữ lại vì
 * `shareCardVariantForStatus()` và tài liệu vẫn nhắc tới nó như tên gọi hai biến
 * thể. Nhãn nút thật nằm ở `SEND_TO_ZALO_LABEL` và `DOWNLOAD_IMAGE_LABEL`.
 *
 * Lý do đổi: từ DEC-064, **tấm ảnh luôn hiện sẵn ngay trên màn hình**. Người
 * dùng nhìn thấy mình đang cầm tấm nào, nên nhãn nút không phải gánh việc đó
 * nữa — nó quay về mô tả **hành động** ("Tải ảnh về máy"), ngắn và không mơ hồ.
 */
export const SHARE_IMAGE_LABEL: Record<ShareCardVariant, string> = {
  MORNING: 'Lưu hình báo cáo đầu ngày',
  EVENING: 'Xuất ảnh báo cáo',
};

/**
 * Nhãn hai nút của **giao diện điện thoại** — PHASE 14, DEC-062.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO ĐIỆN THOẠI CÓ NHÃN RIÊNG, KHÔNG DÙNG `SHARE_IMAGE_LABEL`
 * ─────────────────────────────────────────────────────────────────────────
 *  Trên điện thoại, "xuất ảnh" không phải một việc mà là **hai việc khác nhau**,
 *  và người dùng biết rõ mình đang muốn việc nào:
 *
 *    • **Gửi cho người khác** → Zalo. Đây là mục đích gốc của cả tính năng.
 *    • **Cất lại cho mình** → Thư viện ảnh.
 *
 *  Một nhãn chung ("Xuất ảnh báo cáo") bắt người dùng đoán xem nó làm việc nào,
 *  và câu trả lời còn đổi theo thiết bị — đúng thứ đã sinh ra ISSUE-029. Máy
 *  tính thì ngược lại: không có Zalo trong bảng chia sẻ của Windows (DEC-060) và
 *  cũng không có "thư viện ảnh", nên ở đó vẫn là một nút tải file duy nhất.
 *
 *  Nhãn nút Zalo **chia theo biến thể** để giữ nguyên điều DEC-058 cố ý đặt vào
 *  nhãn cũ: người dùng phải biết mình đang gửi *cam kết đầu ngày* hay *kết quả
 *  cuối ngày*. Gộp thành một chữ "Gửi qua Zalo" là làm mất thông tin đó ở đúng
 *  màn hình mà cả hai tấm đều có thể xuất hiện.
 *
 *  ⚠ **Nút Zalo mở BẢNG CHIA SẺ của hệ điều hành, nơi Zalo là một mục.**
 *  Không có cách nào đẩy thẳng một file vào một cuộc trò chuyện Zalo từ trình
 *  duyệt — Zalo không có deep link nhận file, và trang web không với tới được
 *  ứng dụng khác. Nhãn này mô tả **ý định**, còn bảng chia sẻ là con đường duy
 *  nhất tồn tại. Đừng hứa hơn thế trong bất kỳ chữ nào của giao diện.
 */
export const SEND_TO_ZALO_LABEL: Record<ShareCardVariant, string> = {
  MORNING: 'Gửi cam kết qua Zalo',
  EVENING: 'Gửi kết quả qua Zalo',
};

/**
 * Nút tải ảnh — PHASE 14, **DEC-064**. Có ở **cả** điện thoại lẫn máy tính.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO KHÔNG CÒN LÀ "LƯU VÀO THƯ VIỆN ẢNH"
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản DEC-061 đặt nhãn "Lưu vào thư viện ảnh" cho một nút chỉ **hiện ảnh ra**
 *  rồi bảo người dùng nhấn giữ. Người dùng bác thẳng:
 *
 *  > *"tôi không thích cách phải giữ ảnh mới tải xuống hay chuyển ảnh đi được,
 *  > vì nếu làm vậy những người 'mù công nghệ' sẽ không biết làm"*
 *
 *  Họ đúng, và nhãn cũ còn **hứa sai**: bấm vào không có gì được lưu vào thư
 *  viện cả. Nay nút làm đúng một việc mà mọi người đều hiểu — **bấm là tải** —
 *  và nhãn nói đúng việc đó.
 *
 *  Không chia theo biến thể: tải ảnh là **cùng một việc** với tấm sáng lẫn tấm
 *  chiều, và tấm nào thì ảnh xem trước ngay bên trên đã trả lời.
 */
export const DOWNLOAD_IMAGE_LABEL = 'Tải ảnh về máy';

/**
 * `status` đã persist → biến thể ảnh. Là hàm chứ không phải một `Record` để chỗ
 * gọi không phải tự nghĩ xem trạng thái lạ thì rơi vào đâu.
 *
 * ⚠ **Đây là chỗ BR-002 được diễn giải, sau khi DEC-058 nới nó.** Điều kiện
 * "chỉ xuất ảnh từ dữ liệu ĐÃ PERSIST" giữ nguyên hiệu lực — đầu vào của hàm là
 * `status` đọc từ database, không bao giờ là trạng thái form phía client.
 */
export function shareCardVariantForStatus(status: ReportStatus): ShareCardVariant {
  return status === 'COMPLETED' ? 'EVENING' : 'MORNING';
}

/** Đầu vào của thẻ ảnh: đúng những cột nó đọc, không hơn (NFR-002). */
export type ShareCardSource = KpiMetricSource &
  Pick<
    DailyReportRow,
    'report_date' | 'planned_route' | 'actual_route' | 'evening_note' | 'status'
  > & {
    readonly sales: Pick<ProfileRow, 'full_name' | 'employee_code'>;
  };

export type ShareCardMetricRow = {
  readonly label: string;
  /** Cam kết sáng, dạng RÚT GỌN cho vừa khung bảng (`docs/05 §14`). */
  readonly targetText: string;
  /** Thực đạt cuối ngày, cũng dạng rút gọn. */
  readonly actualText: string;
  /** Kết quả thô của `lib/kpi.ts`; component chỉ đọc `display` và `status`. */
  readonly achievement: AchievementResult;
  /** Thanh tiến độ nhỏ dưới ô "Hoàn thành" — PHASE 18, DEC-069. */
  readonly progress: ShareCardProgress;
};

/**
 * Thanh tiến độ của một dòng chỉ tiêu — PHASE 18, **DEC-069**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO TÍNH Ở ĐÂY CHỨ KHÔNG PHẢI TRONG COMPONENT
 * ─────────────────────────────────────────────────────────────────────────
 *  "Vẽ dài bao nhiêu" và "có cháy hay không" là hai câu hỏi **nghiệp vụ**, và
 *  câu thứ hai còn dính BR-004 (không clamp `%`) lẫn BR-015 (ca `target = 0`).
 *  Component chỉ được biết hai con số đã trả lời sẵn (AGENTS.md §1.3).
 */
export type ShareCardProgress = {
  /**
   * Chiều dài thanh, **đã clamp về `[0, 1]`**.
   *
   * ⚠ Clamp CHỈ ở đây, và chỉ cho việc VẼ. `achievement.percent` vẫn giữ giá trị
   * thật (`300%` in ra `300,0%`) vì BR-004 cấm clamp con số. Một thanh không thể
   * dài hơn khung của nó, nên phần vượt được kể bằng **ngọn lửa** thay vì bằng
   * chiều dài.
   */
  readonly fill: number;
  /**
   * `true` → vẽ ngọn lửa ở mút phải, nghĩa là **thực sự vượt** chỉ tiêu.
   *
   * ⚠ **Nghiêm ngặt `> 100`, không phải `>= 100`.** Nếu mọi dòng đạt đúng
   * `100,0%` cũng bốc cháy thì ngọn lửa mất hết ý nghĩa — nó phải nói được điều
   * mà cột `%` chưa nói. Ca `target = 0 && actual > 0` (BR-015, `percent = null`
   * nhưng có `surplus`) **cũng cháy**: làm được trong khi không đặt mục tiêu thì
   * đúng là vượt kế hoạch.
   */
  readonly isBlazing: boolean;
};

/** Thanh rỗng, không cháy — dùng cho `PENDING` (chưa có số liệu cuối ngày). */
const EMPTY_PROGRESS: ShareCardProgress = { fill: 0, isBlazing: false };

/**
 * `AchievementResult` → hình dạng thanh. Hàm thuần, có unit test riêng.
 *
 * Không tự chia lại `actual / target`: mọi phép tính đã xong ở `lib/kpi.ts`
 * (NFR-012). Hàm này chỉ **diễn giải** kết quả đó thành hai con số để vẽ.
 */
export function buildProgress(achievement: AchievementResult): ShareCardProgress {
  // Chưa có số liệu thì không có gì để vẽ — thanh rỗng, và ô "%" đã hiện '—'.
  if (achievement.status === 'PENDING') return EMPTY_PROGRESS;

  // BR-015 nhánh 2: `target = 0 && actual > 0`. Không có `%` nào tồn tại, nhưng
  // đây là ca vượt rõ ràng nhất ⇒ thanh đầy và cháy.
  if (achievement.percent === null) {
    return { fill: 1, isBlazing: achievement.surplus !== null && achievement.surplus > 0 };
  }

  const fill = Math.min(Math.max(achievement.percent / 100, 0), 1);

  return { fill, isBlazing: achievement.percent > 100 };
}

export type ShareCardModel = {
  /** Bản sáng hay bản chiều — quyết định bố cục (DEC-058). */
  readonly variant: ShareCardVariant;
  /** `'CAM KẾT ĐẦU NGÀY'` | `'KẾT QUẢ CUỐI NGÀY'`. */
  readonly kindLabel: string;
  /** `'Thứ Sáu, 07/08/2026'`. */
  readonly dateText: string;
  /** Tên đã viết HOA theo thiết kế `docs/05 §14`. */
  readonly salesName: string;
  /**
   * Cỡ chữ tên, đã thu để tên nằm gọn **một dòng** — PHASE 19.
   *
   * Ở model chứ không ở component: đây là phép tính bố cục có thể sai, và
   * `AGENTS.md §1.3` bắt mọi thứ có thể sai phải kiểm được bằng unit test.
   */
  readonly nameFontSize: number;
  /** `null` khi Sales chưa có mã nhân viên — khi đó không render dòng đó. */
  readonly employeeCode: string | null;
  /** Tuyến THỰC TẾ, lùi về tuyến kế hoạch nếu cuối ngày không nhập lại. */
  readonly routeText: string | null;
  /** Cỡ chữ tuyến, đã thu để tuyến không quá **hai dòng** — PHASE 19. */
  readonly routeFontSize: number;
  readonly metrics: readonly ShareCardMetricRow[];
  /**
   * Cụm "Tình trạng thực hiện" dưới bảng — PHASE 19, **DEC-070**. Có ở **cả
   * hai** biến thể.
   *
   * ⚠ Chỗ này đã đổi chủ HAI lần. DEC-056 đặt khối "Số khách làm việc"; DEC-068
   * thay bằng cụm lũy kế tháng (doanh số / doanh thu / ngày đạt KPI) cộng từ
   * `daily_reports`; DEC-070 thay tiếp bằng cụm này. Đừng khôi phục khối nào cũ.
   *
   * Khác biệt cốt lõi so với DEC-068: ba trong bốn dòng lấy THỰC ĐẠT từ **MISA
   * AMIS** chứ không từ số Sales tự khai. Đó chính là điều người dùng muốn cấp
   * trên nhìn thấy — con số hệ thống ghi nhận, không phải con số tự báo.
   *
   * `null` khi Sales chưa map `amis_employee_name`, hoặc tháng đó chưa được đồng
   * bộ. Khi đó thẻ **bỏ hẳn cụm** thay vì in bốn dấu `—`: một khối trống trên
   * tấm ảnh gửi cấp trên trông như lỗi hệ thống.
   */
  readonly performance: ShareCardPerformance | null;
  readonly noteText: string | null;
};

/**
 * Cắt chuỗi ở ranh giới TỪ, không cắt giữa một từ.
 *
 * Cắt giữa từ trên một tấm ảnh gửi cho khách trông như lỗi hiển thị, còn cắt ở
 * khoảng trắng thì đọc vẫn ra nghĩa. Nếu trong ngưỡng không có khoảng trắng nào
 * (một chuỗi dài liền mạch — đúng thứ mà `docs/05 §14` gọi là "tuyến 300 ký
 * tự"), đành cắt cứng: thà cụt còn hơn tràn ra ngoài khung.
 */
export function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;

  // `maxLength` đã tính cả dấu `…`, nên chỗ cho chữ chỉ còn `maxLength - 1`.
  const head = trimmed.slice(0, maxLength - 1);
  const lastSpace = head.lastIndexOf(' ');

  const cut = lastSpace > 0 ? head.slice(0, lastSpace) : head;

  return `${cut.trimEnd()}${ELLIPSIS}`;
}

/** Chuỗi rỗng / chỉ khoảng trắng được coi như KHÔNG có dữ liệu. */
function optionalText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Dựng toàn bộ chuỗi hiển thị của thẻ ảnh từ một dòng `daily_reports`.
 *
 * Hàm này **thuần**: không đọc đồng hồ, không chạm mạng, không chạm database.
 * Nhờ vậy mọi edge case của Phase 6 là một lời gọi hàm trong unit test.
 */
export function buildShareCardModel(
  source: ShareCardSource,
  performance: ShareCardPerformanceSource | null,
  variantOverride: ShareCardVariant | null = null,
): ShareCardModel {
  const metrics = KPI_METRIC_ROWS.map((row): ShareCardMetricRow => {
    const target = source[row.targetColumn];
    const actual = source[row.actualColumn];
    const achievement = calculateAchievement(target, actual, row.metric);

    return {
      // `shortLabel` chứ không `label`: cột nhãn của thẻ ảnh có bề rộng CỐ ĐỊNH
      // và Satori không đo được chữ để tự thu nhỏ. Từ PHASE 13, hai nhãn đầy đủ
      // ("Doanh thu công nợ", "Khách hàng đã gặp") dài quá khung — DEC-050.
      label: row.shortLabel,
      targetText: formatMetricValueCompact(target, row.metric),
      actualText: formatMetricValueCompact(actual, row.metric),
      achievement,
      progress: buildProgress(achievement),
    };
  });

  const variant = variantOverride ?? shareCardVariantForStatus(source.status);

  const route = optionalText(source.actual_route) ?? optionalText(source.planned_route);
  const routeText = route === null ? null : truncateText(route, MAX_SHARE_ROUTE_CHARS);

  const salesName = source.sales.full_name.trim().toLocaleUpperCase('vi-VN');

  const note = optionalText(source.evening_note);
  // Ngân sách tính TRÊN CHUỖI ĐÃ CẮT của tuyến, không phải chuỗi gốc: tuyến 300
  // ký tự vẫn chỉ chiếm 2 dòng sau `truncateText`.
  const noteBudget = shareNoteBudget(source.sales.full_name, routeText, performance !== null);

  return {
    variant,
    kindLabel: VARIANT_KIND_LABEL[variant],
    dateText: formatVietnamDate(source.report_date),
    salesName,
    // Đo trên chuỗi ĐÃ IN HOA — đó là chuỗi thật sự được vẽ.
    nameFontSize: shareNameFontSize(salesName),
    employeeCode: optionalText(source.sales.employee_code),
    routeText,
    // Đo trên chuỗi ĐÃ CẮT: tuyến 300 ký tự chỉ còn 104 sau `truncateText`, thu
    // cỡ chữ theo chuỗi gốc là thu thừa cho một đoạn không bao giờ được vẽ.
    routeFontSize: shareRouteFontSize(routeText),
    metrics,
    // Cụm này có ở CẢ HAI biến thể: số AMIS là luỹ kế tháng, không phụ thuộc
    // việc hôm nay Sales đã nhập thực đạt hay chưa.
    performance: performance === null ? null : buildPerformance(performance),
    // `noteBudget === 0` ⇒ phần đầu thẻ đã ăn hết chỗ ⇒ bỏ hẳn khối ghi chú.
    noteText: note === null || noteBudget === 0 ? null : truncateText(note, noteBudget),
  };
}

/* ---------------------------------------------------------------------------
 * Cụm TÌNH TRẠNG THỰC HIỆN — PHASE 19, DEC-070
 *
 * Thay cho cụm lũy kế tháng của DEC-068. Bốn dòng, mỗi dòng bốn cột: nhãn ·
 * chỉ tiêu · thực đạt · % hoàn thành (kèm thanh tiến độ).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA ĐIỀU PHẢI BIẾT VỀ NGUỒN SỐ
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Số là LUỸ KẾ THÁNG, không phải số của ngày trên thẻ.** AMIS chỉ báo cáo
 *     theo tháng. Dòng `rangeText` vì thế bắt buộc phải có — người nhận trên
 *     Zalo không có ngữ cảnh nào khác ngoài tấm ảnh.
 *  2. **Số phụ thuộc lần ĐỒNG BỘ gần nhất, không phải thời điểm xuất ảnh.**
 *     Script `scripts/amis-sync/push_amis.py` chạy tay vì ba trong bốn nguồn
 *     AMIS dùng cookie phiên trình duyệt hết hạn sau ~24h. Không ai chạy ba
 *     ngày thì ảnh in số của ba ngày trước — nên `synced_at` phải hiện ra.
 *  3. **Chỉ tiêu doanh thu KHÔNG đến từ AMIS.** AMIS biết đã thu bao nhiêu
 *     nhưng không biết mục tiêu; con số đó cộng từ `target_revenue` của chính
 *     các báo cáo trong tháng.
 * ------------------------------------------------------------------------- */

/** Một dòng: nhãn · chỉ tiêu · thực đạt · % hoàn thành + thanh tiến độ. */
export type ShareCardPerformanceRow = {
  readonly label: string;
  readonly targetText: string;
  readonly actualText: string;
  readonly achievement: AchievementResult;
  readonly progress: ShareCardProgress;
};

/** Số liệu AMIS tham khảo, không có chỉ tiêu và không có `%` hoàn thành. */
export type ShareCardSupplementaryMetric = {
  readonly label: string;
  readonly valueText: string;
};

export type ShareCardPerformance = {
  /** `'TÌNH TRẠNG THỰC HIỆN'`. */
  readonly title: string;
  /** `'Số liệu MISA tính đến 15/08/2026'` — mốc ĐỒNG BỘ, không phải ngày báo cáo. */
  readonly rangeText: string;
  readonly rows: readonly ShareCardPerformanceRow[];
  /** Ba số liệu phụ nối tiếp bảng theo ba dòng canh giữa, mỗi dòng chỉ có tên + thực đạt. */
  readonly supplementaryMetrics: readonly ShareCardSupplementaryMetric[];
};

/**
 * Đầu vào: sáu con số AMIS + hai chỉ tiêu tháng của Admin + tổng chỉ tiêu doanh
 * thu cộng từ báo cáo trong tháng (đường lùi khi Admin chưa giao chỉ tiêu).
 */
export type ShareCardPerformanceSource = {
  /** Mục tiêu doanh số — dashboard AMIS `TargetAmount`. */
  readonly amisTargetAmount: number | null;
/**
   * Doanh số đã thực hiện — dashboard AMIS `CurrentAmount`.
   *
   * ⚠ Phải là `current_amount`, KHÔNG phải `net_sales` của report 119. Hai con
   * số đo hai thứ khác nhau: dashboard lọc "Đã ghi + Từ chối ghi", report 119
   * chỉ "Đã ghi" — chênh ~50 triệu ở kỳ 08/2026.
   */
  readonly amisSalesActual: number | null;
  /** Công nợ đã thu — AMIS Kế toán `receive_amount`. */
  readonly amisReceiveAmount: number | null;
  /** SL khách phụ trách — report 119 `QuantityAccountInCharge`. */
  readonly amisAccountInCharge: number | null;
  /** SL khách đã tương tác — report 119 `QuantityAccountInteractive`. */
  readonly amisAccountInteractive: number | null;
  /** SL khách mua trong kỳ — report 119 `QuantityAccountSoldThisPeriod`. */
  readonly amisAccountSold: number | null;
  /** Số đơn hàng trong kỳ — report 119 `NoOfOrders`. */
  readonly amisOrderCount: number | null;
  /** Giá trị hàng hóa trả lại trong kỳ — report 119 `ReturnSales`. */
  readonly amisReturnAmount: number | null;
  /** ISO timestamp lần đồng bộ gần nhất; `null` ⇒ nói thẳng là chưa đồng bộ. */
  readonly syncedAt: string | null;
  /**
   * Chỉ tiêu THÁNG do Admin giao — `sales_monthly_targets` (DEC-071).
   *
   * Đây là hai con số của bảng KPI công ty, và chúng **thắng** hai đường cũ:
   * `amisTargetAmount` của AMIS và tổng cam kết ngày `targetRevenue`. `null` ⇒
   * chưa giao chỉ tiêu tháng cho người này, khi đó rơi về đường cũ.
   */
  readonly monthlyTargetSalesAmount: number | null;
  readonly monthlyTargetRevenue: number | null;
  /**
   * Tổng `target_revenue` của tháng — cộng từ cam kết NGÀY của Sales.
   *
   * Chỉ còn là đường lùi khi `monthlyTargetRevenue` là `null`: con số này là
   * tổng những gì Sales tự hứa, không phải chỉ tiêu công ty giao.
   */
  readonly targetRevenue: number;
};

/** Lệch múi giờ VN so với UTC, tính bằng mili giây. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * `synced_at` (timestamptz UTC) → `'YYYY-MM-DD'` theo giờ VN.
 *
 * Không cắt thẳng 10 ký tự đầu của chuỗi ISO: một lần đồng bộ lúc 21h giờ VN
 * được lưu là 14h UTC **cùng ngày**, nhưng đồng bộ lúc 2h sáng giờ VN thì lưu
 * là 19h UTC **hôm trước** — cắt thô sẽ in lùi một ngày và người đọc tưởng số
 * cũ hơn thực tế.
 */
function vietnamDatePart(isoTimestamp: string): string | null {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return null;

  return new Date(parsed + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Một dòng của cụm. Đi qua ĐÚNG `calculateAchievement()` mà bảng chính dùng —
 * không có công thức `%` thứ hai nào trong dự án này (NFR-012).
 */
function buildPerformanceRow(
  label: string,
  target: number | null,
  actual: number | null,
  metric: KpiMetricName,
): ShareCardPerformanceRow {
  const achievement = calculateAchievement(target, actual, metric);

  return {
    label,
    // Dạng RÚT GỌN như bảng chính: cụm có bốn cột trong một khối chỉ rộng
    // 900px sau khi trừ lề trong, không đủ chỗ cho số tiền đầy đủ.
    targetText: formatMetricValueCompact(target, metric),
    actualText: formatMetricValueCompact(actual, metric),
    achievement,
    progress: buildProgress(achievement),
  };
}

const EMPTY_PERFORMANCE_DISPLAY = '—';

function formatOrderCount(orderCount: number | null): string {
  if (orderCount === null || !Number.isFinite(orderCount) || orderCount < 0) {
    return EMPTY_PERFORMANCE_DISPLAY;
  }

  return `${formatThousands(orderCount)} đơn`;
}

function buildPerformance(source: ShareCardPerformanceSource): ShareCardPerformance {
  const syncedDate = source.syncedAt === null ? null : vietnamDatePart(source.syncedAt);
  const averageOrderValue = calculateAverageOrderValue(
    source.amisSalesActual,
    source.amisOrderCount,
  );

  return {
    title: 'TÌNH TRẠNG THỰC HIỆN',
    rangeText:
      syncedDate === null
        ? // Nói thẳng ra thay vì im lặng: bốn con số không rõ tính đến bao giờ
          // thì vô dụng với người đọc.
          'Chưa rõ mốc đồng bộ từ MISA'
        : `Số liệu MISA tính đến ${formatVietnamShortDate(syncedDate)}`,
    rows: [
      // Hai dòng tiền lấy chỉ tiêu từ bảng KPI tháng của Admin (DEC-071); chỉ khi
      // chưa giao mới rơi về đường cũ. `??` chứ không `||`: chỉ tiêu 0 là con số
      // hợp lệ (BR-015 có hẳn nhánh cho `target = 0`).
      buildPerformanceRow(
        'Doanh số đã ghi',
        source.monthlyTargetSalesAmount ?? source.amisTargetAmount,
        source.amisSalesActual,
        'SALES_AMOUNT',
      ),
      buildPerformanceRow(
        'Doanh thu đã ghi',
        source.monthlyTargetRevenue ?? source.targetRevenue,
        source.amisReceiveAmount,
        'REVENUE',
      ),
      buildPerformanceRow(
        'SL KH đã ghé thăm',
        source.amisAccountInCharge,
        source.amisAccountInteractive,
        'CUSTOMER_VISITS',
      ),
      // Chỉ tiêu của dòng này là số khách ĐÃ TƯƠNG TÁC — tức "đã gặp thì phải
      // bán được". Không phải số khách phụ trách: đòi bán cho toàn bộ danh sách
      // phụ trách trong một tháng là một mục tiêu không ai đặt.
      buildPerformanceRow(
        'SL KH đã mua hàng',
        source.amisAccountInteractive,
        source.amisAccountSold,
        'CUSTOMER_VISITS',
      ),
    ],
    supplementaryMetrics: [
      { label: 'SL ĐH đã ghi', valueText: formatOrderCount(source.amisOrderCount) },
      {
        label: 'Giá trị trung bình 1 đơn',
        valueText: formatMetricValueCompact(averageOrderValue, 'SALES_AMOUNT'),
      },
      {
        label: 'Giá trị hàng hóa trả hàng',
        valueText: formatMetricValueCompact(source.amisReturnAmount, 'SALES_AMOUNT'),
      },
    ],
  };
}

/* ---------------------------------------------------------------------------
 * Khoảng lũy kế tháng — PHASE 17, DEC-068 (giữ nguyên ở DEC-070)
 * ------------------------------------------------------------------------- */

/**
 * Mốc dừng của lũy kế, theo BIẾN THỂ — đây là chỗ câu chốt của người dùng ngày
 * 2026-08-14 được viết thành code:
 *
 * > *"báo cáo được làm chiều ngày 21 tháng 9 thì các chỉ số phải lấy từ ngày 1
 * > đến 21 (bao gồm cả thực đạt của 21). nếu là sáng ngày 21 tháng 9 thì chỉ
 * > cộng đến chỉ số thực đạt của 20 vì ngày 21 chưa có thực đạt"*
 *
 * ⚠ Việc lùi một ngày ở bản sáng là CỐ Ý và **không thừa**, dù cột `actual_*`
 * của ngày hôm đó đang `null` nên cộng vào cũng ra 0.
 *
 * ⚠ **PHASE 19 (DEC-070) — khoảng này nay CHỈ còn dùng cho `targetRevenue`.**
 * Ba con số kia đến từ AMIS và AMIS chốt theo tháng lịch, không theo mốc này.
 * Vì vậy dòng "tính đến…" trên thẻ nay in `synced_at` chứ không in `range.to`.
 *
 * Trả `null` chỉ khi `reportDate` không phải ngày thật; tầng gọi khi đó bỏ hẳn
 * cụm thay vì đoán bừa một khoảng.
 */
export function shareMonthRange(
  reportDate: string,
  variant: ShareCardVariant,
): MonthToDateRange | null {
  const throughDate =
    variant === 'EVENING' ? reportDate : shiftVietnamDate(reportDate, -1);

  if (throughDate === null) return null;

  return getVietnamMonthToDateRange(reportDate, throughDate);
}

/* ---------------------------------------------------------------------------
 * Tên file tải về — FR-019
 * ------------------------------------------------------------------------- */

/** `đ`/`Đ` KHÔNG tách được bằng NFD nên phải thay tay. */
const D_WITH_STROKE = /[đĐ]/g;
/** Dấu thanh và dấu phụ sau khi `normalize('NFD')` tách chúng ra khỏi nguyên âm. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;
/** Mọi thứ không phải chữ cái ASCII hoặc chữ số đều thành dấu nối. */
const NON_ASCII_ALNUM = /[^A-Za-z0-9]+/g;

/** Dùng khi tên rỗng hoặc chỉ gồm ký tự bị loại bỏ hết — tên file vẫn phải hợp lệ. */
const FALLBACK_NAME_SLUG = 'Sales';

/**
 * `'Nguyễn Văn A'` → `'Nguyen-Van-A'`.
 *
 * Bỏ dấu là CỐ Ý (FR-019): tên file có dấu tiếng Việt bị mã hoá percent khi đi
 * qua header `Content-Disposition`, và hiển thị thành chuỗi rác trên một số máy
 * Android khi lưu về máy.
 */
export function asciiNameSlug(fullName: string): string {
  const slug = fullName
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(D_WITH_STROKE, (char) => (char === 'đ' ? 'd' : 'D'))
    .replace(NON_ASCII_ALNUM, '-')
    .replace(/^-+|-+$/g, '');

  return slug === '' ? FALLBACK_NAME_SLUG : slug;
}

/** Tên file gọn, phân biệt hai tấm ảnh của cùng một ngày (DEC-058). */
const VARIANT_FILE_NAME: Record<ShareCardVariant, string> = {
  MORNING: 'Bao_Cao_Ngay',
  EVENING: 'Bao_Cao_Cuoi_Ngay',
};

/**
 * `'Bao_Cao_Cuoi_Ngay_2026-08-07.png'` — FR-019, `docs/07 §4.1`.
 * Bản sáng: `'Bao_Cao_Ngay_2026-08-07.png'`.
 *
 * Ngày dùng NGUYÊN `report_date` dạng `YYYY-MM-DD`: tên file phải sắp xếp được
 * theo thứ tự thời gian khi Sales lưu nhiều ảnh vào cùng một thư mục.
 *
 * ⚠ **`variant` là tham số BẮT BUỘC, cố ý không có giá trị mặc định.** Từ
 * DEC-058 mỗi ngày có HAI tấm ảnh; một mặc định thầm lặng sẽ khiến tấm sáng ghi
 * đè tấm chiều trong thư mục Tải về của điện thoại — đúng thứ người dùng sẽ chỉ
 * phát hiện ra sau khi đã gửi nhầm.
 */
export function shareImageFileName(
  _fullName: string,
  reportDate: string,
  variant: ShareCardVariant,
): string {
  return `${VARIANT_FILE_NAME[variant]}_${reportDate}.png`;
}

/**
 * URL của Route Handler ảnh — nơi DUY NHẤT ghép đường dẫn này, để nút chia sẻ
 * và mọi test đều trỏ về cùng một chỗ nếu route đổi tên (cùng tinh thần với
 * hằng số đường dẫn ở `lib/reports/today-cta.ts`).
 */
export function shareImagePath(reportId: string): string {
  return `/api/reports/${reportId}/share-image`;
}

/* ---------------------------------------------------------------------------
 * Chế độ XEM của route ảnh — PHASE 14, DEC-061
 * ------------------------------------------------------------------------- */

/**
 * Tham số bật chế độ **xem** thay vì **tải**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI CÓ HAI CHẾ ĐỘ — đọc trước khi gộp lại làm một
 * ─────────────────────────────────────────────────────────────────────────
 *  Người dùng báo ngày 2026-08-11 (**ISSUE-029**): trên điện thoại bấm nút thì
 *  file rơi vào thư mục **Tải xuống**, không vào Thư viện ảnh, và họ không tìm
 *  ra nó.
 *
 *  Đây KHÔNG sửa được bằng cách đổi tên file hay đổi header cho "đúng hơn":
 *  **trang web không có bất kỳ API nào ghi được vào Thư viện ảnh của Android
 *  hay app Ảnh của iOS.** Đó là giới hạn của hệ điều hành. Chỉ còn đúng hai
 *  đường vào thư viện, và cả hai đều cần con người chạm:
 *
 *    1. Bảng chia sẻ của hệ điều hành → "Lưu ảnh" — `navigator.share()`.
 *    2. **Nhấn giữ vào một tấm ảnh ĐANG HIỂN THỊ** → "Lưu ảnh" / "Tải ảnh xuống".
 *
 *  Đường (2) đòi ảnh phải được HIỆN RA. `Content-Disposition: attachment` thì
 *  không bao giờ hiện — trình duyệt tải thẳng rồi thôi. Vì vậy route cần một
 *  chế độ trả `inline`, và đó là toàn bộ lý do tồn tại của tham số này.
 *
 *  ⚠ Giữ **mặc định là tải về**: máy tính không có "thư viện ảnh", và cả bộ E2E
 *  lẫn thói quen người dùng máy tính đều dựa trên hành vi tải file.
 */
export const SHARE_IMAGE_VIEW_PARAM = 'view';

/** Giá trị DUY NHẤT được chấp nhận — route so sánh đúng chuỗi này, không parse. */
export const SHARE_IMAGE_VIEW_VALUE = '1';

/** Chỉ route ảnh dùng và chỉ chấp nhận cho phiên Admin đã xác minh. */
export const SHARE_IMAGE_VARIANT_PARAM = 'variant';

/**
 * `/api/reports/<id>/share-image?view=1` — cùng route và cùng quyền; mặc định
 * chỉ khác `Content-Disposition`. Màn Admin có thể truyền thêm biến thể cuối
 * ngày để xem các ô đang thiếu dưới dạng chờ; route tự kiểm role trước khi dựng.
 *
 * Không đẻ ra route thứ hai vì mọi thứ đáng giá của route ảnh (xác thực, RLS,
 * BR-002, chọn biến thể theo `status`) phải chạy y hệt. Một route thứ hai là một
 * bản sao của những luật đó, và bản sao thì trôi.
 */
export function shareImageViewPath(
  reportId: string,
  variantOverride: ShareCardVariant | null = null,
): string {
  const path = `${shareImagePath(reportId)}?${SHARE_IMAGE_VIEW_PARAM}=${SHARE_IMAGE_VIEW_VALUE}`;
  return variantOverride === null
    ? path
    : `${path}&${SHARE_IMAGE_VARIANT_PARAM}=${variantOverride}`;
}
