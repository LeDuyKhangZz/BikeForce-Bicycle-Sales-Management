/**
 * Hình học của biểu đồ trend theo ngày — HÀM THUẦN, không JSX, không I/O.
 * FR-037, AF-08 (PHASE 9).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO TOÀN BỘ PHÉP TÍNH TOẠ ĐỘ NẰM Ở `lib/` CHỨ KHÔNG Ở COMPONENT
 * ─────────────────────────────────────────────────────────────────────────
 *  DEC-023 / AGENTS.md §1.2: component không chứa business logic. Một biểu đồ
 *  trông "chỉ là JSX" nhưng thật ra là ba phép tính dễ sai âm thầm:
 *    • chia cho `max` — mà `max` có thể bằng 0 (cả tháng chưa ai bán được gì);
 *    • chia cho số cột — mà số cột có thể bằng 0 (tháng chưa có báo cáo nào);
 *    • quy đổi giá trị → chiều cao, chỗ một dấu trừ đặt sai làm cột mọc ngược.
 *  Cả ba đều KHÔNG ném lỗi, chúng chỉ vẽ ra một hình sai — đúng loại lỗi mà
 *  unit test bắt được còn mắt thường thì không. Tách ra đây để test không cần
 *  DOM, không cần database.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BẤT BIẾN BẮT BUỘC (cùng tinh thần BR-015 của `lib/kpi.ts`)
 * ─────────────────────────────────────────────────────────────────────────
 *  Mọi số trong `TrendChartModel` LUÔN là số hữu hạn. Không `NaN`, không
 *  `Infinity`, không chiều cao âm — một thuộc tính SVG nhận `NaN` thì trình
 *  duyệt bỏ qua cả phần tử **mà không báo gì**, nên biểu đồ sẽ biến mất chứ
 *  không đỏ lên. Có một bài test quét lưới khoá bất biến này.
 *
 *  File này KHÔNG tính `%` và KHÔNG format số: `lib/kpi.ts` vẫn là nguồn duy
 *  nhất của cả hai (BR-011, NFR-012). Ở đây chỉ có toạ độ.
 */
import type { KpiMetric } from '@/lib/kpi';

/* ===========================================================================
 * HỆ TOẠ ĐỘ
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  SVG CHỈ CHỨA HÌNH, CHỮ NẰM Ở HTML — và đây là quyết định đã đo bằng mắt
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản đầu tiên đặt cả nhãn ngày vào trong `<svg>` với viewBox cố định và
 *  `width: 100%`. Ở 375px thì vừa đẹp; ở 1440px thì SVG phóng to **2,7 lần**,
 *  kéo theo chữ `font-size: 11` render thành ~30px và biểu đồ cao 540px —
 *  phá vỡ toàn bộ type scale của `docs/05 §3.3`. Ảnh chụp thật cho thấy rõ.
 *
 *  Cách sửa: mọi CHỮ chuyển ra HTML bên ngoài SVG (nên nó nhận đúng
 *  `--text-xs` như phần còn lại của trang), còn SVG chỉ còn hình chữ nhật và
 *  vạch lưới. Nhờ vậy SVG được phép kéo giãn tự do bằng
 *  `preserveAspectRatio="none"` + chiều cao cố định bằng CSS: cột rộng ra theo
 *  màn hình, chiều cao không đổi, và không còn chữ nào bị phóng to.
 *
 *  Hệ quả bắt buộc: **`PLOT_LEFT = 0` và `PLOT_RIGHT = CHART_WIDTH`**, để mỗi
 *  khe cột khớp chính xác với một ô `flex: 1` của hàng nhãn HTML bên dưới.
 *  Lệch một chút ở đây là nhãn "01" không còn nằm dưới cột ngày 01.
 * ========================================================================= */

export const CHART_WIDTH = 360;
export const CHART_HEIGHT = 180;

const PLOT_LEFT = 0;
const PLOT_RIGHT = CHART_WIDTH;
/** Chừa một chút phía trên để cột cao nhất không dính mép khung. */
const PLOT_TOP = 4;
/** Chừa chỗ cho nét đường đáy, vẽ bằng stroke không co giãn. */
const PLOT_BOTTOM = CHART_HEIGHT - 2;

const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

/** Bề rộng cột cam kết so với khe của nó; phần còn lại là khoảng thở. */
const TARGET_BAR_RATIO = 0.72;
/** Cột thực đạt vẽ ĐÈ LÊN giữa cột cam kết, hẹp hơn để lộ ra khung tham chiếu. */
const ACTUAL_BAR_RATIO = 0.5;
/** Trần bề rộng cột: tháng chỉ có 2–3 ngày dữ liệu thì cột không phình thành khối. */
const MAX_TARGET_BAR_WIDTH = 26;

/** Số vạch lưới ngang, KHÔNG kể đường đáy. `docs/05 §15` — gridline mảnh, thưa. */
const GRID_LINE_COUNT = 3;

/** Trần nhãn ngày hiện trên trục X trước khi phải giãn thưa ra. */
const MAX_DAY_LABELS = 8;

/* ===========================================================================
 * KIỂU DỮ LIỆU
 * ========================================================================= */

/** Một ngày có số liệu. `date` là `'YYYY-MM-DD'` — ngày nghiệp vụ giờ VN (BR-005). */
export type TrendPoint = {
  date: string;
  target: number;
  actual: number;
};

export type TrendBar = {
  date: string;
  /** Chỉ phần NGÀY (`'08'`) — trục X đã nằm trong ngữ cảnh một tháng. */
  dayLabel: string;
  target: number;
  actual: number;
  /** Toạ độ khung cam kết. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Toạ độ cột thực đạt, vẽ đè lên giữa khung trên. */
  actualX: number;
  actualY: number;
  actualWidth: number;
  actualHeight: number;
  /** Tâm khe — nơi đặt nhãn ngày. */
  centerX: number;
  /** Trục X chỉ hiện một phần nhãn để không chồng chữ. */
  showLabel: boolean;
};

export type TrendChartModel = {
  metric: KpiMetric;
  bars: TrendBar[];
  /** Giá trị ứng với đỉnh vùng vẽ. **Luôn > 0**, kể cả khi mọi số đều 0. */
  maxValue: number;
  /** Tung độ các vạch lưới ngang, từ trên xuống. Không kèm nhãn số — xem chú thích. */
  gridLines: readonly number[];
  /** Tung độ mép trên vùng vẽ — cột cao kịch trần dừng ở đây. */
  plotTop: number;
  /** Tung độ đường đáy. */
  baselineY: number;
  width: number;
  height: number;
};

/* ===========================================================================
 * CHỌN CHỈ TIÊU TỪ URL
 * ========================================================================= */

/**
 * Chỉ tiêu mặc định của biểu đồ. Doanh thu là con số Admin hỏi trước nhất
 * (`docs/01 §12.2`), nên nó là thứ hiện ra khi chưa chọn gì.
 */
export const DEFAULT_TREND_METRIC: KpiMetric = 'REVENUE';

const TREND_METRICS: readonly KpiMetric[] = [
  'VISIT_POINTS',
  'SALES_AMOUNT',
  'REVENUE',
  'CUSTOMER_VISITS',
];

/**
 * `?metric=` → một `KpiMetric` dùng được.
 *
 * Cùng quy ước với `parsePageParam()`: mọi đầu vào rác về giá trị mặc định chứ
 * KHÔNG ném lỗi. `searchParams` là chuỗi người dùng gõ được vào URL, và một
 * `?metric=abc` không đáng để cả trang trả 500.
 */
export function parseTrendMetric(raw: string | undefined): KpiMetric {
  if (typeof raw !== 'string') return DEFAULT_TREND_METRIC;

  const found = TREND_METRICS.find((metric) => metric === raw);

  return found ?? DEFAULT_TREND_METRIC;
}

/* ===========================================================================
 * DỰNG MÔ HÌNH
 * ========================================================================= */

/**
 * Quy đổi một giá trị thành chiều cao trong vùng vẽ.
 *
 * Kẹp vào `[0, PLOT_HEIGHT]` **trước** khi trả về: dữ liệu âm không tồn tại
 * theo CHECK constraint của `daily_reports`, nhưng hàm này cũng phục vụ số tổng
 * do tầng khác truyền vào, và một cột cao âm sẽ vẽ ngược lên trên đầu biểu đồ
 * mà không có gì báo lỗi.
 */
function heightFor(value: number, maxValue: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const ratio = value / maxValue;

  if (!Number.isFinite(ratio) || ratio <= 0) return 0;

  return Math.min(ratio, 1) * PLOT_HEIGHT;
}

/**
 * Bước giãn nhãn trục X: hiện ngày thứ 1, 1+step, 1+2·step…
 *
 * Với 31 cột và trần 8 nhãn thì `step = 4` — hiện 8 nhãn, đủ để định vị mà
 * không chồng chữ ở 375px.
 */
function labelStep(count: number): number {
  if (count <= MAX_DAY_LABELS) return 1;

  return Math.ceil(count / MAX_DAY_LABELS);
}

/**
 * Danh sách điểm theo ngày → toạ độ SVG.
 *
 * Trả `bars: []` khi không có điểm nào; component tự quyết hiện empty state.
 * Hàm KHÔNG tự bịa dữ liệu cho ngày trống — RPC `admin_daily_trend` cố ý chỉ
 * trả ngày có báo cáo hoàn tất (xem đầu migration 0007).
 */
export function buildTrendChart(points: readonly TrendPoint[], metric: KpiMetric): TrendChartModel {
  const empty: TrendChartModel = {
    metric,
    bars: [],
    maxValue: 1,
    gridLines: [],
    plotTop: PLOT_TOP,
    baselineY: PLOT_BOTTOM,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  };

  if (points.length === 0) return empty;

  /*
   * Đỉnh vùng vẽ là giá trị lớn nhất của CẢ cam kết LẪN thực đạt: nếu chỉ lấy
   * theo cam kết thì một ngày vượt kế hoạch sẽ có cột tràn ra ngoài khung.
   *
   * `|| 1` chặn đúng ca cả tháng toàn số 0 (`target = 0` là hợp lệ theo BR-015):
   * mọi phép chia sau đó vẫn hữu hạn, và mọi cột cao 0 — trung thực, không NaN.
   */
  const maxValue =
    points.reduce((max, point) => {
      const local = Math.max(
        Number.isFinite(point.target) ? point.target : 0,
        Number.isFinite(point.actual) ? point.actual : 0,
      );

      return local > max ? local : max;
    }, 0) || 1;

  const slot = PLOT_WIDTH / points.length;
  const targetWidth = Math.min(slot * TARGET_BAR_RATIO, MAX_TARGET_BAR_WIDTH);
  const actualWidth = targetWidth * ACTUAL_BAR_RATIO;
  const step = labelStep(points.length);

  const bars = points.map((point, index) => {
    const centerX = PLOT_LEFT + slot * index + slot / 2;
    const targetHeight = heightFor(point.target, maxValue);
    const actualHeight = heightFor(point.actual, maxValue);

    return {
      date: point.date,
      // Ngày nghiệp vụ luôn là `'YYYY-MM-DD'` (BR-005) nên hai ký tự cuối là
      // phần ngày. `slice` chịu được cả chuỗi ngắn bất thường mà không ném lỗi.
      dayLabel: point.date.slice(8, 10),
      target: point.target,
      actual: point.actual,
      x: centerX - targetWidth / 2,
      y: PLOT_BOTTOM - targetHeight,
      width: targetWidth,
      height: targetHeight,
      actualX: centerX - actualWidth / 2,
      actualY: PLOT_BOTTOM - actualHeight,
      actualWidth,
      actualHeight,
      centerX,
      showLabel: index % step === 0,
    } satisfies TrendBar;
  });

  /*
   * Vạch lưới chia đều vùng vẽ. Cố ý KHÔNG kèm nhãn số: nhãn tiền VND đầy đủ
   * (`125.000.000 ₫`) không đọc được ở cỡ chữ của trục, mà rút gọn thành
   * `125tr` thì phải dùng `formatCompactVND` — hàm đó CHỈ dành cho thẻ ảnh 9:16
   * (kết luận Phase 6). Con số chính xác nằm ở bảng dữ liệu kèm theo biểu đồ,
   * đúng yêu cầu "mọi biểu đồ có phương án data-table thay thế".
   */
  const gridLines = Array.from(
    { length: GRID_LINE_COUNT },
    (_unused, index) => PLOT_TOP + (PLOT_HEIGHT / (GRID_LINE_COUNT + 1)) * (index + 1),
  );

  return {
    metric,
    bars,
    maxValue,
    gridLines,
    plotTop: PLOT_TOP,
    baselineY: PLOT_BOTTOM,
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  };
}
