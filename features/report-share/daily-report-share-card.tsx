import { achievementLabel, type AchievementStatus } from '@/lib/kpi';
import type { ShareCardMetricRow, ShareCardModel, ShareCardProgress } from '@/lib/reports/share-card';

/**
 * Thẻ ảnh chia sẻ 9:16 — bố cục `docs/05 §14`, render bằng **Satori** trong
 * `app/api/reports/[id]/share-image/route.tsx` (DEC-010, FR-018).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BỐN KỶ LUẬT CỦA SATORI — ISSUE-002. Vi phạm là ảnh vỡ, không phải lỗi build
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Chỉ flexbox, không CSS Grid.** Mọi phần tử có NHIỀU HƠN MỘT con phải
 *     khai báo `display: 'flex'` tường minh.
 *  2. **Chỉ hex thuần**, lấy từ bảng đã đo contrast ở `docs/05 §4.5`. Không
 *     `oklch()`, không biến CSS, không class Tailwind — Satori không có
 *     stylesheet nào để tra.
 *  3. **Không `-webkit-line-clamp`.** Tuyến và ghi chú đã được cắt sẵn ở
 *     `lib/reports/share-card.ts` trước khi tới đây.
 *  4. **Không `className`, chỉ `style`.**
 *
 *  Component này KHÔNG tính gì: mọi chuỗi đến từ `buildShareCardModel()`, mọi
 *  con số đã đi qua `lib/kpi.ts` (NFR-012). Việc duy nhất nó tự quyết là ánh xạ
 *  `status → màu`, đúng như `achievement-badge.tsx` ánh xạ `status → tone` cho
 *  bản web: đó là TRÌNH BÀY, không phải nghiệp vụ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 14 — HAI THAY ĐỔI LỚN, ĐỌC TRƯỚC KHI SỬA
 * ─────────────────────────────────────────────────────────────────────────
 *  • **DEC-057** — thẻ đổi từ nền tối `#0B1220` sang **nền TRẮNG tone logo**.
 *    Người dùng nói thẳng bản cũ "tối quá". Bảng màu dưới đây lấy nguyên các
 *    token đã đo của DEC-046, nên ảnh và web nay nói cùng một thứ tiếng màu.
 *  • **DEC-058** — thẻ có **hai biến thể**: `MORNING` (bảng 2 cột, chỉ cam kết)
 *    và `EVENING` (bảng 4 cột, có `%` hoàn thành). Biến thể do `model.variant`
 *    quyết định ở tầng dữ liệu; component không tự đoán.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PHASE 17 — DEC-068
 * ─────────────────────────────────────────────────────────────────────────
 *  Khối "Số khách làm việc" (DEC-056, chỉ có ở bản chiều) **đã bị gỡ** theo yêu
 *  cầu trực tiếp của người dùng ngày 2026-08-14. Thay vào đúng vị trí đó là
 *  **cụm lũy kế tháng** — doanh số tháng, doanh thu tháng, số ngày đạt KPI —
 *  và cụm này có ở **cả hai** biến thể. Đừng thêm lại khối cũ.
 */

/**
 * Bảng màu SÁNG của thẻ ảnh — DEC-057, mọi giá trị lấy từ DEC-046.
 *
 * Tỉ lệ tương phản đo bằng công thức relative luminance của WCAG 2.x, trên nền
 * trắng `#FFFFFF` và trên nền sọc `#F4F7FA`:
 *
 * | Màu | trên trắng | trên sọc |
 * |---|---:|---:|
 * | `heading  #0B4A76` | 9,31:1 | 8,66:1 |
 * | `body     #0F172A` | 17,85:1 | 16,60:1 |
 * | `muted    #566A7B` | 5,61:1 | 5,22:1 |
 * | `accentText #97580B` | 5,65:1 | — |
 * | `exceeded #166534` | 7,13:1 | 6,63:1 |
 * | `near     #92400E` | 7,09:1 | 6,59:1 |
 * | `missed   #991B1B` | 8,31:1 | 7,73:1 |
 *
 * Trên nền cam nhạt `#FDF1E3`: `body` **16,04:1** · `accentText` **5,08:1** ·
 * `muted` **5,04:1**. Cặp thấp nhất của cả thẻ là 5,04:1 — vẫn dư AA.
 *
 * ⚠ **Cam logo `#E9A04F` chỉ được làm NỀN và làm vạch trang trí.** Chữ trắng
 * trên nó đo được **2,19:1** và bị DEC-046 cấm tuyệt đối; chữ cam trên nền sáng
 * phải dùng `accentText`.
 */
const COLOR = {
  background: '#FFFFFF',
  /** Nền sọc của bảng — cùng giá trị với `--color-background` của web. */
  zebra: '#F4F7FA',
  heading: '#0B4A76',
  body: '#0F172A',
  muted: '#566A7B',
  /** Cam logo NGUYÊN BẢN. Chỉ làm nền/vạch, không bao giờ làm chữ. */
  accent: '#E9A04F',
  /** Nền cam rất nhạt cho khối nhấn mạnh. */
  accentSoft: '#FDF1E3',
  /** Chữ sắc cam, đủ tương phản trên nền sáng. */
  accentText: '#97580B',
  exceeded: '#166534',
  near: '#92400E',
  missed: '#991B1B',
  /** Đường kẻ mảnh — TRANG TRÍ, không mang thông tin. */
  rule: '#DDE5EC',
} as const;

/**
 * `status → màu`. `NEAR` dùng nâu-cam `#92400E` (cùng sắc với thương hiệu, đủ
 * 7,09:1); `PENDING` dùng màu nhãn vì "chưa có số liệu" không phải một kết quả
 * tốt hay xấu.
 *
 * Màu KHÔNG BAO GIỜ là thông tin duy nhất (`docs/05 §4.4` — quy tắc
 * `color-not-only`): mỗi ô "Hoàn thành" luôn kèm nhãn chữ của `achievementLabel()`.
 * Ảnh gửi qua Zalo còn bị nén màu, nên đây là ràng buộc thật chứ không hình thức.
 */
const STATUS_COLOR: Record<AchievementStatus, string> = {
  EXCEEDED: COLOR.exceeded,
  NEAR: COLOR.near,
  MISSED: COLOR.missed,
  PENDING: COLOR.muted,
};

/** Lề trái/phải của thẻ. Bề rộng nội dung = 1080 − 2 × 56 = **968px**. */
const PAGE_PADDING = 56;
const CONTENT_WIDTH = 1080 - PAGE_PADDING * 2;

/** Bốn cột của bản CHIỀU, cộng lại đúng 968px. */
const EVENING_COLUMN = {
  metric: 268,
  target: 190,
  actual: 190,
  achievement: 320,
} as const;

/** Hai cột của bản SÁNG — không có "Thực đạt" và "Hoàn thành" để mà chia. */
const MORNING_COLUMN = {
  metric: 600,
  target: 368,
} as const;

/** Đệm ngang trong lòng mỗi dòng bảng, để chữ không dính sát mép sọc. */
const ROW_PADDING_X = 16;

/**
 * **KHOÁ CHỐNG CHỒNG CHỮ — ISSUE-032, PHASE 17. Đừng gỡ khỏi khối nào.**
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Thẻ cao **cố định** 1920px, còn nội dung thì không: tên Sales có thể 2 dòng,
 *  tuyến 2 dòng, ghi chú 4 dòng. Khi tổng chiều cao vượt 1920, Yoga (bộ layout
 *  của Satori) làm đúng mặc định của flexbox — **nén mọi con lại** vì
 *  `flex-shrink` mặc định là 1. Kết quả không phải là "ảnh bị cắt" mà là chữ
 *  **chồng lên nhau**: tên Sales đè lên ngày, dòng chân đè lên footer. Nhìn
 *  tấm PNG mới thấy; không assertion nào bắt được (bài học DEC-053/DEC-054).
 *
 *  `flexShrink: 0` nói: khối này giữ nguyên chiều cao thật của nó. Đặt cho MỌI
 *  khối mang thông tin bắt buộc, và để đúng **một** khối co được — ghi chú, thứ
 *  ít quan trọng nhất trên thẻ — kèm `overflow: 'hidden'` để phần thừa bị cắt
 *  gọn thay vì tràn đè. Ảnh vì thế xấu đi một chút ở ca cực đoan, nhưng không
 *  bao giờ vỡ.
 */
const NO_SHRINK = { flexShrink: 0 } as const;

/**
 * Nhịp chữ của bảng, KHÁC NHAU giữa hai biến thể — và đây là cỡ chữ đã sửa sau
 * khi **nhìn tận mắt hai tấm PNG render ra**.
 *
 * Bản đầu tiên dùng chung một cỡ cho cả hai: bản chiều còn tạm, nhưng bản sáng
 * chỉ có 4 con số nên nội dung kết thúc ở khoảng 1030/1920 — gần **nửa tấm ảnh
 * là khoảng trắng**, trông như ảnh bị lỗi chứ không như một thiết kế thoáng.
 * Bản sáng vì thế đọc như một tấm áp phích: dòng cao, số to.
 *
 * ⚠ **PHASE 17 (DEC-068): `MORNING.paddingY` hạ từ 70 xuống 44 — đừng nâng lại.**
 * Cụm lũy kế tháng chiếm ~350px ngay dưới bảng, nên khoảng trắng mà con số 70
 * sinh ra để lấp nay không còn tồn tại. Giữ 70 thì bản sáng **tràn quá 1920px**,
 * và Satori không cắt bớt: nó nén các khối lại cho tới khi chữ **chồng lên
 * nhau** — tên Sales đè lên ngày, dòng chân đè lên footer. Lỗi đó không có phép
 * đo nào bắt được, chỉ nhìn tấm PNG mới thấy (bài học DEC-053/DEC-054).
 *
 * Bài học DEC-053 lặp lại: bốn nhóm luật đo được đều xanh mà mắt vẫn thấy sai.
 */
const ROW_METRICS = {
  MORNING: { paddingY: 44, label: 42, value: 56 },
  // ⚠ PHASE 18 (DEC-069): `EVENING.paddingY` hạ 30 → 10 để **bù** chiều cao khối
  // thanh tiến độ (dải lửa 34px + thanh 14px + 8px lề = 56px mỗi dòng). Không bù
  // thì bản chiều vượt 1920px và chữ chồng lên nhau — ISSUE-032 đã dạy đúng bài
  // này một lần rồi.
  EVENING: { paddingY: 10, label: 36, value: 36 },
} as const;

type HeaderCellSpec = {
  readonly text: string;
  readonly width: number;
  readonly align: 'left' | 'right';
};

const MORNING_HEADER: readonly HeaderCellSpec[] = [
  { text: 'CHỈ TIÊU', width: MORNING_COLUMN.metric, align: 'left' },
  { text: 'CAM KẾT', width: MORNING_COLUMN.target, align: 'right' },
];

const EVENING_HEADER: readonly HeaderCellSpec[] = [
  { text: 'CHỈ TIÊU', width: EVENING_COLUMN.metric, align: 'left' },
  { text: 'CAM KẾT', width: EVENING_COLUMN.target, align: 'right' },
  { text: 'THỰC ĐẠT', width: EVENING_COLUMN.actual, align: 'right' },
  { text: 'HOÀN THÀNH', width: EVENING_COLUMN.achievement, align: 'right' },
];

function HeaderCell({ text, width, align }: { text: string; width: number; align: 'left' | 'right' }) {
  return (
    <div
      style={{
        display: 'flex',
        width,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        fontSize: 30,
        fontWeight: 700,
        color: COLOR.muted,
        letterSpacing: 0.6,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Thanh tiến độ + ngọn lửa vượt chỉ tiêu — PHASE 18, DEC-069
 * ------------------------------------------------------------------------- */

/**
 * Kích thước thanh. Cố ý **nhỏ**: người dùng dặn thẳng *"thiết kế thanh nhỏ thôi
 * cẩn thận bị đụng hàng vì ảnh xuất ra hiện tại rất đẹp rồi"*.
 *
 * Rộng 200 chứ không phải cả 320px của cột: thanh ngắn hơn cột chữ nên nó đọc ra
 * là **chú thích của con số**, không phải một thành phần thứ hai tranh chỗ.
 */
const PROGRESS = {
  width: 200,
  height: 14,
  /** Viền pill — cũng là thứ khiến "phần chưa đạt" nhìn thấy được. */
  border: 2,
} as const;

/** Bán kính pill = nửa chiều cao ⇒ hai đầu tròn hoàn toàn. */
const PROGRESS_RADIUS = PROGRESS.height / 2;

/** Bề rộng lòng trong, sau khi trừ viền hai bên. */
const PROGRESS_INNER_WIDTH = PROGRESS.width - PROGRESS.border * 2;
const PROGRESS_INNER_HEIGHT = PROGRESS.height - PROGRESS.border * 2;

/**
 * Ngọn lửa của trạng thái **vượt chỉ tiêu** — người dùng yêu cầu trực tiếp.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA RÀNG BUỘC ĐÃ CÂN, ĐỌC TRƯỚC KHI "LÀM CHO NÓ NỔI HƠN"
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Không dùng emoji 🔥.** `docs/05` cấm emoji làm icon, và quan trọng hơn:
 *     font Inter nhúng trong `public/fonts/` **không có glyph emoji** nên Satori
 *     sẽ vẽ ra ô vuông rỗng trên tấm ảnh gửi khách. Đây là SVG path.
 *  2. **Không đổi màu thanh sang đỏ.** Xanh `#166534` = đạt là quy ước đã dùng
 *     khắp thẻ và khắp web; đổi thanh sang đỏ/cam khi vượt là đảo ngược tín hiệu
 *     ngay trong cùng một ô với chữ xanh. Thanh **vẫn xanh và đầy**; ngọn lửa là
 *     lớp phủ thêm ở mút phải, nói "đầy đến mức cháy".
 *  3. **Màu lửa lấy từ tone logo** (`#E9A04F` → `#C2410C`), không phải đỏ tươi —
 *     để nó hoà vào thẻ chứ không nhảy ra như một sticker.
 */
/**
 * Ba tầng màu của lửa, xếp từ ngoài vào trong — đúng cách một ngọn lửa thật
 * sáng dần về lõi. Tất cả đều là **tone cam của logo**, không phải đỏ tươi, để
 * dải lửa hoà vào thẻ chứ không nhảy ra như một sticker dán thêm.
 */
const FLAME = {
  /** Lưỡi ngoài, sẫm nhất — viền của ngọn lửa. */
  outer: '#C2410C',
  /** Thân lửa — cam logo. */
  mid: '#E9A04F',
  /** Lõi sáng. */
  core: '#FCD34D',
} as const;

/**
 * Tỉ lệ gốc của một lưỡi lửa: rộng 12, cao 24 — **mảnh gấp đôi** icon lửa thông
 * thường (22×28).
 *
 * Lượt render đầu dùng đúng path icon "mập" ấy cho cả dải, và kết quả nhìn ra
 * **răng cưa** chứ không ra lửa: 11 hình tròn trịa chen nhau thì mắt đọc thành
 * một hàng rào. Lửa thật có lưỡi **cao, mảnh, nhọn đầu** và chênh nhau rõ.
 */
const FLAME_RATIO = 12 / 24;

/** Path lưỡi ngoài — dùng chung cho mọi ngọn, chỉ đổi kích thước và màu. */
const FLAME_OUTER_PATH =
  'M6 0c.6 4.2 3.1 6.6 4.4 9.3.9 1.8 1.1 3.4 1.1 4.9 0 5.6-2.4 9.8-5.5 9.8S.5 19.8.5 14.2c0-2.7 1.2-5 2.7-7.2.2 1.7.9 2.8 1.9 3.3C4.7 6.4 5.3 3.1 6 0z';

/** Path lõi — mảnh hơn nữa, nằm ở nửa dưới, cho chiều sâu. */
const FLAME_CORE_PATH =
  'M6 23.8c-1.9 0-3.3-1.7-3.3-3.9 0-1.9 1-3.3 1.9-4.8.3.8.7 1.3 1.2 1.5-.2-2 .5-3.6 1.5-4.9.7 1.7 2 3.2 2 5.5 0 2.5-1.4 4.6-3.3 4.6z';

/**
 * Một ngọn lửa. Satori dựng được `<svg>` với `path` (nó dùng đúng cơ chế này cho
 * icon), nhưng **không** dựng được `<linearGradient>` hay `filter: blur()` một
 * cách đáng tin — nên chiều sâu ở đây làm bằng **hai lớp màu đặc**, và quầng
 * sáng mờ quanh lửa là thứ **không thể có** trên tấm ảnh này.
 */
function Flame({ height, outer }: { height: number; outer: string }) {
  const width = Math.round(height * FLAME_RATIO);

  return (
    <svg width={width} height={height} viewBox="0 0 12 24">
      <path d={FLAME_OUTER_PATH} fill={outer} />
      <path d={FLAME_CORE_PATH} fill={FLAME.core} />
    </svg>
  );
}

/**
 * Chiều cao từng ngọn trong dải lửa, tính bằng px.
 *
 * Cao thấp **so le** và không đối xứng: một dãy ngọn bằng nhau trông như hàng
 * rào răng cưa chứ không như lửa. Ngọn cao nhất lệch về bên phải — phía "đầu"
 * thanh, nơi mức hoàn thành chạm trần.
 */
const FLAME_STRIP_HEIGHTS = [20, 28, 23, 33, 22, 30, 25, 34, 23, 28, 22, 26, 20] as const;

/**
 * Hai ngọn liền nhau chồng lấp chừng này px, để chân dải liền mạch trong khi các
 * đỉnh vẫn tách rời — đúng hình lửa thật.
 *
 * ⚠ Số âm = chồng lấp, số **dương** = giãn ra. Ở đây là `-3`, tức các ngọn cách
 * nhau 3px: 13 ngọn × `height × 0,5` cộng lại ≈ 168px, cộng 12 khe × 3px cho ra
 * **≈ 204px** — vừa khít thanh 200px. Đổi `FLAME_STRIP_HEIGHTS` thì phải tính
 * lại, nếu không dải lửa sẽ hụt hoặc thò ra khỏi thanh.
 */
const FLAME_OVERLAP = -3;

/** Chiều cao ngọn lớn nhất — quyết định khoảng trống phải chừa phía trên thanh. */
const FLAME_STRIP_HEIGHT = Math.max(...FLAME_STRIP_HEIGHTS);

/**
 * **Dải lửa bọc thanh tiến độ** — PHASE 18, bản thứ hai của DEC-069.
 *
 * Người dùng đưa ảnh mẫu và nói rõ ý muốn: lửa **cháy bọc cả thanh**, không phải
 * một ngọn nhỏ ở mút phải như bản đầu — *"nhưng đừng để lửa che chữ"*.
 *
 * Dựng bằng cách ghép nhiều `<Flame>` chồng lấp nhau bằng `marginLeft` âm, thay
 * vì một path dài duy nhất: Satori **không** hỗ trợ `transform` trên phần tử SVG
 * một cách đáng tin, nên không thể nhân bản một ngọn bằng `<g transform>`. Cách
 * này chỉ dùng flexbox và `<path>` — hai thứ đã chứng minh chạy được.
 *
 * Lửa nằm **sau** pill trong thứ tự DOM ⇒ thanh vẽ đè lên chân lửa, nên dải lửa
 * trông như đang liếm từ dưới thanh lên chứ không phải một hình dán lên trên.
 */
function FlameStrip() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', height: FLAME_STRIP_HEIGHT }}>
      {FLAME_STRIP_HEIGHTS.map((height, index) => (
        <div
          key={`${height}-${index}`}
          style={{
            display: 'flex',
            marginLeft: index === 0 ? 0 : -FLAME_OVERLAP,
          }}
        >
          {/* Ngọn chẵn màu sẫm, ngọn lẻ cam logo: hai sắc xen kẽ tạo cảm giác
              lớp lang, thứ mà một dải cùng một màu không bao giờ có. */}
          <Flame height={height} outer={index % 2 === 0 ? FLAME.outer : FLAME.mid} />
        </div>
      ))}
    </div>
  );
}

/**
 * Thanh tiến độ nhỏ dưới ô "Hoàn thành" — dạng **bullet chart thu gọn**, không
 * phải gauge: bốn chỉ tiêu xếp dọc trong một cột hẹp thì gauge quá lớn.
 *
 * Thanh **không mang thông tin duy nhất**: con số `%` và nhãn chữ ngay trên nó
 * vẫn nói đủ (luật `color-not-only` của `docs/05 §4.4`). Nó là lớp giúp đọc
 * lướt — thứ sếp của người dùng yêu cầu.
 *
 * `PENDING` thì không vẽ gì: một pill rỗng dưới chữ `'—'` chỉ thêm nhiễu.
 */
function ProgressBar({
  progress,
  status,
}: {
  progress: ShareCardProgress;
  status: AchievementStatus;
}) {
  if (status === 'PENDING') return null;

  const color = STATUS_COLOR[status];
  const fillWidth = Math.round(PROGRESS_INNER_WIDTH * progress.fill);

  return (
    /*
     * Khối cao `FLAME_STRIP_HEIGHT + PROGRESS.height` ở **MỌI** dòng, kể cả dòng
     * không cháy — cùng lý do với ô lửa ngang của bản đầu: chừa chỗ sẵn thì bốn
     * thanh thẳng hàng tuyệt đối, còn để dải lửa tự đẩy thì riêng dòng vượt chỉ
     * tiêu bị xô lệch so với ba dòng kia.
     *
     * `justifyContent: 'flex-end'` ghim pill xuống đáy khối; phần trống phía
     * trên chính là chỗ cho lửa liếm lên, và cũng là thứ giữ cho lửa **không
     * chạm vào nhãn chữ** — điều người dùng dặn thẳng.
     */
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        position: 'relative',
        width: PROGRESS.width,
        height: FLAME_STRIP_HEIGHT + PROGRESS.height,
        marginTop: 8,
      }}
    >
      {/* Lửa đứng TRƯỚC pill trong DOM ⇒ Satori vẽ nó xuống dưới, nên thanh đè
          lên chân lửa và dải trông như đang liếm lên từ dưới thanh. */}
      {progress.isBlazing && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 0,
            // Chân lửa chìm 6px vào thân thanh, không đứng chông chênh trên mép.
            bottom: PROGRESS.height - 6,
          }}
        >
          <FlameStrip />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          width: PROGRESS.width,
          height: PROGRESS.height,
          borderRadius: PROGRESS_RADIUS,
          // Viền cùng màu trạng thái: nó vừa là khung để thấy "còn thiếu bao
          // nhiêu", vừa đủ tương phản trên CẢ nền trắng lẫn nền sọc #F4F7FA —
          // một track xám nhạt thì biến mất sau khi Zalo nén ảnh (DEC-057).
          border: `${PROGRESS.border}px solid ${color}`,
          backgroundColor: COLOR.background,
        }}
      >
        {/* Chỉ vẽ phần đã đạt khi nó có bề rộng thật — một hộp 0px vẫn để lại
            vệt bo góc mờ trong Satori. */}
        {fillWidth > 0 && (
          <div
            style={{
              display: 'flex',
              width: fillWidth,
              height: PROGRESS_INNER_HEIGHT,
              borderRadius: PROGRESS_RADIUS,
              backgroundColor: color,
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Một dòng chỉ tiêu.
 *
 * `zebra` là **sọc nền chẵn/lẻ** thay cho đường kẻ ngang của bản tối cũ: ảnh gửi
 * Zalo bị nén lại, và một đường kẻ 1px `#DDE5EC` (1,25:1) là thứ đầu tiên biến
 * mất sau khi nén. Một mảng nền rộng thì không.
 */
function MetricRow({
  row,
  zebra,
  variant,
}: {
  row: ShareCardMetricRow;
  zebra: boolean;
  variant: ShareCardModel['variant'];
}) {
  const isMorning = variant === 'MORNING';
  const size = ROW_METRICS[variant];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: size.paddingY,
        paddingBottom: size.paddingY,
        paddingLeft: ROW_PADDING_X,
        paddingRight: ROW_PADDING_X,
        backgroundColor: zebra ? COLOR.zebra : COLOR.background,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: isMorning ? MORNING_COLUMN.metric : EVENING_COLUMN.metric,
          fontSize: size.label,
          color: COLOR.body,
        }}
      >
        {row.label}
      </div>

      <div
        style={{
          display: 'flex',
          width: isMorning ? MORNING_COLUMN.target : EVENING_COLUMN.target,
          justifyContent: 'flex-end',
          fontSize: size.value,
          // Bản sáng: cam kết là con số DUY NHẤT của dòng ⇒ nó là số chính, in
          // đậm. Bản chiều: nó là mốc để so, nên nhường phần nhấn cho "Thực đạt".
          fontWeight: isMorning ? 700 : 400,
          color: isMorning ? COLOR.heading : COLOR.muted,
        }}
      >
        {row.targetText}
      </div>

      {!isMorning && (
        <div
          style={{
            display: 'flex',
            width: EVENING_COLUMN.actual,
            justifyContent: 'flex-end',
            fontSize: size.value,
            fontWeight: 700,
            color: COLOR.body,
          }}
        >
          {row.actualText}
        </div>
      )}

      {!isMorning && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: EVENING_COLUMN.achievement,
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 700,
              color: STATUS_COLOR[row.achievement.status],
            }}
          >
            {row.achievement.display}
          </div>
          {/* Nhãn chữ — thứ giữ cho thông tin không phụ thuộc vào màu. */}
          <div style={{ display: 'flex', fontSize: 24, color: COLOR.muted, marginTop: 4 }}>
            {achievementLabel(row.achievement)}
          </div>

          <ProgressBar progress={row.progress} status={row.achievement.status} />
        </div>
      )}
    </div>
  );
}

type Props = {
  model: ShareCardModel;
};

export function DailyReportShareCard({ model }: Props) {
  const isMorning = model.variant === 'MORNING';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1920,
        backgroundColor: COLOR.background,
        color: COLOR.body,
        // Tên này phải trùng `fonts[].name` truyền cho `ImageResponse`.
        fontFamily: 'Inter',
        paddingTop: 64,
        paddingBottom: 48,
        paddingLeft: PAGE_PADDING,
        paddingRight: PAGE_PADDING,
      }}
    >
      {/* ── Thương hiệu ────────────────────────────────────────────────────────
          Vạch cam nằm NGANG phía trên chữ, không phải nền của chữ: cam logo chỉ
          được làm nền khi chữ trên nó là chữ tối (DEC-046). */}
      <div
        style={{ ...NO_SHRINK, display: 'flex', width: 132, height: 10, backgroundColor: COLOR.accent }}
      />
      <div
        style={{
          ...NO_SHRINK,
          display: 'flex',
          fontSize: 50,
          fontWeight: 700,
          color: COLOR.heading,
          letterSpacing: 2,
          marginTop: 18,
        }}
      >
        BIKEFORCE
      </div>
      <div
        style={{
          ...NO_SHRINK,
          display: 'flex',
          fontSize: 26,
          fontWeight: 600,
          color: COLOR.accentText,
          letterSpacing: 5,
          marginTop: 8,
        }}
      >
        {model.kindLabel}
      </div>

      <div
        style={{ ...NO_SHRINK, display: 'flex', height: 3, backgroundColor: COLOR.heading, marginTop: 24 }}
      />

      {/* ── Ngày nghiệp vụ (BR-005) ────────────────────────────────────────── */}
      <div style={{ ...NO_SHRINK, display: 'flex', fontSize: 36, color: COLOR.muted, marginTop: 28 }}>
        {model.dateText}
      </div>

      {/* ── Sales ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          ...NO_SHRINK,
          display: 'flex',
          fontSize: 64,
          fontWeight: 700,
          color: COLOR.heading,
          marginTop: 10,
          lineHeight: 1.2,
        }}
      >
        {model.salesName}
      </div>
      {model.employeeCode !== null && (
        <div style={{ ...NO_SHRINK, display: 'flex', fontSize: 30, color: COLOR.muted, marginTop: 8 }}>
          {model.employeeCode}
        </div>
      )}

      {model.routeText !== null && (
        <div
          style={{
            ...NO_SHRINK,
            display: 'flex',
            flexDirection: 'column',
            marginTop: 26,
            paddingTop: 22,
            paddingBottom: 22,
            paddingLeft: 24,
            paddingRight: 24,
            backgroundColor: COLOR.zebra,
          }}
        >
          <div style={{ display: 'flex', fontSize: 24, color: COLOR.muted, letterSpacing: 3 }}>
            TUYẾN
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: COLOR.body, marginTop: 8, lineHeight: 1.4 }}>
            {model.routeText}
          </div>
        </div>
      )}

      {/* ── Bảng chỉ tiêu ──────────────────────────────────────────────────── */}
      <div style={{ ...NO_SHRINK, display: 'flex', flexDirection: 'column', marginTop: 30 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            paddingBottom: 12,
            paddingLeft: ROW_PADDING_X,
            paddingRight: ROW_PADDING_X,
          }}
        >
          {/* Dựng bằng MẢNG chứ không bằng `<>…</>`: Satori duyệt cây phần tử
              thô và Fragment là thứ nó không có cách nào dựng ra hộp — mảng thì
              nó xử lý y hệt `metrics.map()` bên dưới. */}
          {(isMorning ? MORNING_HEADER : EVENING_HEADER).map((cell) => (
            <HeaderCell key={cell.text} text={cell.text} width={cell.width} align={cell.align} />
          ))}
        </div>

        <div style={{ display: 'flex', width: CONTENT_WIDTH, height: 2, backgroundColor: COLOR.heading }} />

        {model.metrics.map((row, index) => (
          <MetricRow key={row.label} row={row} zebra={index % 2 === 1} variant={model.variant} />
        ))}

        <div style={{ display: 'flex', width: CONTENT_WIDTH, height: 1, backgroundColor: COLOR.rule }} />
      </div>

      {/* ── Cụm lũy kế tháng — PHASE 17, DEC-068 ────────────────────────────
          Có ở CẢ HAI biến thể. Chỗ này trước đây là khối "Số khách làm việc"
          (DEC-056); người dùng yêu cầu bỏ hẳn nó ngày 2026-08-14 vì cấp trên cần
          thành tích THÁNG, không phải một tỉ lệ của riêng ngày hôm đó. */}
      {model.monthly !== null && (
        <div style={{ ...NO_SHRINK, display: 'flex', marginTop: 30 }}>
          {/* Vạch cam dọc: cam logo làm ĐỒ HOẠ, không mang chữ (DEC-046). */}
          <div style={{ display: 'flex', width: 10, backgroundColor: COLOR.accent }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              backgroundColor: COLOR.accentSoft,
              paddingTop: 24,
              paddingBottom: 26,
              paddingLeft: 32,
              paddingRight: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 600,
                color: COLOR.accentText,
                letterSpacing: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {model.monthly.title}
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: COLOR.muted, marginTop: 6 }}>
              {model.monthly.rangeText}
            </div>

            {/* Mảng chứ không Fragment — Satori không dựng được `<>…</>`. */}
            {model.monthly.rows.map((row, index) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  // Dòng đầu cách phần tiêu đề rộng hơn khoảng cách giữa ba dòng
                  // với nhau: cụm phải đọc ra là "một tiêu đề + một danh sách".
                  marginTop: index === 0 ? 18 : 10,
                }}
              >
                <div style={{ display: 'flex', fontSize: 32, color: COLOR.body }}>{row.label}</div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 38,
                    fontWeight: 700,
                    color: COLOR.heading,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.valueText}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ghi chú cuối ngày ──────────────────────────────────────────────────
          KHỐI DUY NHẤT được phép co (ISSUE-032): khi tên Sales 2 dòng gặp tuyến
          2 dòng gặp ghi chú 4 dòng, một thứ phải nhường. Ghi chú là thứ ít quan
          trọng nhất trên thẻ, và `overflow: 'hidden'` khiến phần thừa bị **cắt
          gọn** thay vì đè lên footer. */}
      {model.noteText !== null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 26,
            flexShrink: 1,
            overflow: 'hidden',
          }}
        >
          <div style={{ ...NO_SHRINK, display: 'flex', fontSize: 26, color: COLOR.muted, letterSpacing: 3 }}>
            GHI CHÚ
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: COLOR.body, marginTop: 10, lineHeight: 1.4 }}>
            {model.noteText}
          </div>
        </div>
      )}

      {/* Bản sáng nói rõ đây mới là một nửa câu chuyện — người nhận trên Zalo
          không có ngữ cảnh nào khác ngoài tấm ảnh này (DEC-058). */}
      {isMorning && (
        <div
          style={{
            ...NO_SHRINK,
            display: 'flex',
            fontSize: 32,
            color: COLOR.muted,
            marginTop: 36,
            lineHeight: 1.4,
          }}
        >
          Kết quả thực đạt sẽ được gửi vào cuối ngày.
        </div>
      )}

      {/* `marginTop: auto` đẩy footer xuống đáy dù nội dung trên dài hay ngắn. */}
      <div style={{ ...NO_SHRINK, display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
        <div style={{ display: 'flex', height: 1, backgroundColor: COLOR.rule }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: 24,
            color: COLOR.muted,
            marginTop: 20,
          }}
        >
          BikeForce · Bicycle Sales Management System
        </div>
      </div>
    </div>
  );
}
