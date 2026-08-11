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
  calculateCustomerWorkRate,
  formatMetricValue,
  formatMetricValueCompact,
  type AchievementResult,
} from '@/lib/kpi';
import { formatVietnamDate } from '@/lib/date';
import { KPI_METRIC_ROWS, type KpiMetricSource } from '@/lib/reports/metric-rows';
import type { Database } from '@/types/database.types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ReportStatus = Database['public']['Enums']['report_status'];

/**
 * Số ký tự tối đa của tuyến trước khi cắt — tương đương **2 dòng** ở cỡ chữ
 * 32px trên khung rộng 984px (1080 trừ hai lề 48px). Ước lượng theo bề rộng
 * trung bình ~0,52em của Inter rồi trừ biên an toàn, vì Satori không cắt hộ.
 */
export const MAX_SHARE_ROUTE_CHARS = 104;

/** Tương đương **4 dòng** ở cỡ chữ 30px, cùng cách ước lượng như trên. */
export const MAX_SHARE_NOTE_CHARS = 232;

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
 * | Khối nhấn mạnh | *(không có)* | "Số khách làm việc" |
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
};

export type ShareCardModel = {
  /** Bản sáng hay bản chiều — quyết định bố cục (DEC-058). */
  readonly variant: ShareCardVariant;
  /** `'CAM KẾT ĐẦU NGÀY'` | `'KẾT QUẢ CUỐI NGÀY'`. */
  readonly kindLabel: string;
  /** `'Thứ Sáu, 07/08/2026'`. */
  readonly dateText: string;
  /** Tên đã viết HOA theo thiết kế `docs/05 §14`. */
  readonly salesName: string;
  /** `null` khi Sales chưa có mã nhân viên — khi đó không render dòng đó. */
  readonly employeeCode: string | null;
  /** Tuyến THỰC TẾ, lùi về tuyến kế hoạch nếu cuối ngày không nhập lại. */
  readonly routeText: string | null;
  readonly metrics: readonly ShareCardMetricRow[];
  /**
   * Khối nhấn mạnh dưới bảng — PHASE 14, **DEC-056**.
   *
   * Trước đây chỗ này là "DOANH THU THỰC ĐẠT" (số tiền đầy đủ). Nó lặp lại đúng
   * con số đã có ở dòng thứ ba của bảng ngay bên trên, nên nhìn tấm ảnh ra hai
   * lần cùng một thông tin. Nay là **"Số khách làm việc"** — một tỉ lệ KHÔNG
   * xuất hiện ở đâu khác trên thẻ.
   *
   * `null` ở bản **sáng**: buổi sáng chưa có số thực đạt nào để chia (DEC-058).
   */
  readonly workRate: ShareCardWorkRate | null;
  readonly noteText: string | null;
};

export type ShareCardWorkRate = {
  /** `'50,0%'` | `'—'` — đã đi qua `lib/kpi.ts`, không tự làm tròn ở đây. */
  readonly display: string;
  /**
   * Dòng phụ giải thích tỉ lệ trên: `'5 khách / 10 điểm'`.
   *
   * `null` khi thiếu một trong hai vế — khi đó `display` cũng là `'—'` và một
   * dòng "— / —" chỉ làm nhiễu. Cả hai vế đều đi qua `formatMetricValue()` nên
   * đơn vị vẫn chỉ được ghép ở đúng một nơi (DEC-025).
   */
  readonly detailText: string | null;
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
export function buildShareCardModel(source: ShareCardSource): ShareCardModel {
  const metrics = KPI_METRIC_ROWS.map((row): ShareCardMetricRow => {
    const target = source[row.targetColumn];
    const actual = source[row.actualColumn];

    return {
      // `shortLabel` chứ không `label`: cột nhãn của thẻ ảnh có bề rộng CỐ ĐỊNH
      // và Satori không đo được chữ để tự thu nhỏ. Từ PHASE 13, hai nhãn đầy đủ
      // ("Doanh thu công nợ", "Khách hàng đã gặp") dài quá khung — DEC-050.
      label: row.shortLabel,
      targetText: formatMetricValueCompact(target, row.metric),
      actualText: formatMetricValueCompact(actual, row.metric),
      achievement: calculateAchievement(target, actual, row.metric),
    };
  });

  const variant = shareCardVariantForStatus(source.status);

  const route = optionalText(source.actual_route) ?? optionalText(source.planned_route);
  const note = optionalText(source.evening_note);

  return {
    variant,
    kindLabel: VARIANT_KIND_LABEL[variant],
    dateText: formatVietnamDate(source.report_date),
    salesName: source.sales.full_name.trim().toLocaleUpperCase('vi-VN'),
    employeeCode: optionalText(source.sales.employee_code),
    routeText: route === null ? null : truncateText(route, MAX_SHARE_ROUTE_CHARS),
    metrics,
    // Bản sáng không có khối tỉ lệ: cả tử lẫn mẫu đều chưa tồn tại. Chặn ở đây
    // chứ không để component tự đoán — nó không được biết luật này (AGENTS.md §1.3).
    workRate: variant === 'EVENING' ? buildWorkRate(source) : null,
    noteText: note === null ? null : truncateText(note, MAX_SHARE_NOTE_CHARS),
  };
}

/**
 * Khối "Số khách làm việc" — DEC-056.
 *
 * Phép chia nằm ở `lib/kpi.ts`; hàm này chỉ ghép hai chuỗi đã format. Dòng phụ
 * chỉ dựng khi CẢ HAI vế có số thật: `'— / —'` không giải thích được gì.
 */
function buildWorkRate(source: ShareCardSource): ShareCardWorkRate {
  const customers = source.actual_customer_visits;
  const points = source.actual_visit_points;

  const { display } = calculateCustomerWorkRate(customers, points);

  const detailText =
    customers === null || points === null
      ? null
      : `${formatMetricValue(customers, 'CUSTOMER_VISITS')} / ${formatMetricValue(points, 'VISIT_POINTS')}`;

  return { display, detailText };
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

/** Đoạn giữa tên file, phân biệt hai tấm ảnh của cùng một ngày (DEC-058). */
const VARIANT_FILE_TOKEN: Record<ShareCardVariant, string> = {
  MORNING: 'CamKet',
  EVENING: 'Report',
};

/**
 * `'BikeForce_Report_Nguyen-Van-A_2026-08-07.png'` — FR-019, `docs/07 §4.1`.
 * Bản sáng: `'BikeForce_CamKet_Nguyen-Van-A_2026-08-07.png'`.
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
  fullName: string,
  reportDate: string,
  variant: ShareCardVariant,
): string {
  return `BikeForce_${VARIANT_FILE_TOKEN[variant]}_${asciiNameSlug(fullName)}_${reportDate}.png`;
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

/**
 * `/api/reports/<id>/share-image?view=1` — cùng route, cùng quyền, cùng ảnh;
 * chỉ khác `Content-Disposition`.
 *
 * Không đẻ ra route thứ hai vì mọi thứ đáng giá của route ảnh (xác thực, RLS,
 * BR-002, chọn biến thể theo `status`) phải chạy y hệt. Một route thứ hai là một
 * bản sao của những luật đó, và bản sao thì trôi.
 */
export function shareImageViewPath(reportId: string): string {
  return `${shareImagePath(reportId)}?${SHARE_IMAGE_VIEW_PARAM}=${SHARE_IMAGE_VIEW_VALUE}`;
}
