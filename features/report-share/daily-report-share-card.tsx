import { achievementLabel, type AchievementStatus } from '@/lib/kpi';
import type {
  ShareCardMetricRow,
  ShareCardModel,
  ShareCardPerformanceRow,
  ShareCardProgress,
  ShareCardSupplementaryMetric,
} from '@/lib/reports/share-card';

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
 *  PHASE 19 — DEC-070
 * ─────────────────────────────────────────────────────────────────────────
 *  Khối dưới bảng đã đổi chủ **ba** lần, đừng khôi phục bản nào cũ:
 *
 *    DEC-056 → "Số khách làm việc" (chỉ có ở bản chiều)
 *    DEC-068 → cụm lũy kế tháng, 3 dòng, cộng từ `daily_reports`
 *    DEC-070 → **cụm "Tình trạng thực hiện"**, 4 dòng × 4 cột, THỰC ĐẠT lấy từ
 *              MISA AMIS
 *
 *  Điều khiến bản mới khác hẳn: ba trong bốn dòng là con số **hệ thống kế toán
 *  ghi nhận**, không phải con số Sales tự khai. Đó là thứ cấp trên muốn thấy.
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

/**
 * Bốn cột của cụm "Tình trạng thực hiện" — PHASE 19, DEC-070.
 *
 * Hẹp hơn bảng chính vì cụm nằm trong một khối có vạch cam 10px và lề trong
 * 32px mỗi bên: `968 − 10 − 64 = 894px`. Bốn số dưới đây cộng lại **đúng 894**.
 * Đổi một cột thì phải bù ở cột khác, nếu không Satori đẩy cột cuối tràn ra.
 */
const PERF_COLUMN = {
  metric: 300,
  target: 178,
  actual: 178,
  achievement: 238,
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
 * Cụm dưới bảng chiếm ~330px ngay dưới bảng, nên khoảng trắng mà con số 70 sinh
 * ra để lấp nay không còn tồn tại. Giữ 70 thì bản sáng **tràn quá 1920px**, và
 * Satori không cắt bớt: nó nén các khối lại cho tới khi chữ **chồng lên nhau**.
 * Lỗi đó không có phép đo nào bắt được, chỉ nhìn tấm PNG mới thấy.
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

/**
 * Tiêu đề cột của cụm "Tình trạng thực hiện". Ô đầu để TRỐNG có chủ ý: nhãn
 * dòng ở đây là tên chỉ số ("Doanh số đã ghi"), không phải một cột cần đặt tên.
 */
const PERFORMANCE_HEADER: readonly HeaderCellSpec[] = [
  { text: '', width: PERF_COLUMN.metric, align: 'left' },
  { text: 'CHỈ TIÊU', width: PERF_COLUMN.target, align: 'right' },
  { text: 'THỰC ĐẠT', width: PERF_COLUMN.actual, align: 'right' },
  { text: '% HOÀN THÀNH', width: PERF_COLUMN.achievement, align: 'right' },
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

/** Cùng ô tiêu đề nhưng cỡ nhỏ hơn — cụm dưới là phụ, không tranh chỗ với bảng. */
function SmallHeaderCell({ text, width, align }: { text: string; width: number; align: 'left' | 'right' }) {
  return (
    <div
      style={{
        display: 'flex',
        width,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        fontSize: 20,
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
 * **Dải lửa là một ẢNH PNG, không phải hình vẽ** — PHASE 18, bản thứ ba của
 * DEC-069.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO BỎ HẲN HAI BẢN TỰ VẼ TRƯỚC ĐÓ
 * ─────────────────────────────────────────────────────────────────────────
 *  Bản 1 — một ngọn lửa SVG ở mút phải: người dùng bác, muốn lửa **bọc cả thanh**.
 *  Bản 2 — ghép 13 lưỡi lửa SVG dọc thanh: người dùng xem rồi nói thẳng
 *  *"xấu quá"*, và tự gửi một ảnh lửa để dùng thay.
 *
 *  Lý do bản vẽ tay không thể đẹp bằng: Satori **không có `filter: blur()`**,
 *  nên mọi thứ nó vẽ đều là mảng màu sắc nét — không có quầng sáng, không có
 *  chuyển sắc mềm, tức là thiếu đúng hai thứ làm nên hình ảnh lửa. Một tấm PNG
 *  thì mang sẵn cả hai trong pixel của nó.
 *
 *  Ảnh nguồn do người dùng gửi (2528×1686). Nền của nó **không thực sự trong
 *  suốt** — hoa văn bàn cờ là pixel xám thật — nên đã phải tách nền bằng hiệu
 *  `R − B`: nền xám luôn có `R = B` nên hiệu này triệt tiêu hoàn toàn hoa văn,
 *  trong khi lửa có `R ≫ B`. Thanh xanh trong ảnh gốc đã bị cắt bỏ vì thanh
 *  thật phải đổi chiều dài theo `%` và đổi màu theo `status`.
 *
 *  ⚠ **HAI LỖI CỦA LƯỢT ĐẦU, đã sửa — đừng lặp lại:**
 *  1. *Đỉnh lửa bị cụt.* Lượt đầu tôi crop từ `y = 560` trong khi lửa bắt đầu ở
 *     `y = 487`, tức **tự tay cắt mất 73px đỉnh** để tiết kiệm chiều cao. Người
 *     dùng phát hiện khi xuất ảnh thật. Nay crop chừa **8px phía trên** ngọn cao
 *     nhất, và ảnh nguồn cũng đã được người dùng hạ bớt chiều cao lửa.
 *  2. *Quầng hào quang.* Ngưỡng tách nền cũ (12) giữ lại cả vùng sáng mờ quanh
 *     lửa; người dùng nói thẳng *"nhìn xấu quá"*. Ngưỡng nay là **28**, loại
 *     sạch phần mờ mà mép lửa vẫn mượt (ở mép `R − B` nhảy 0→200 trong một hai
 *     pixel, không chuyển dần như quầng).
 *
 *  File kết quả: `public/images/flame-strip.png`, 400×99 (2× cỡ hiển thị cho
 *  nét), đã ghim vào bundle qua `outputFileTracingIncludes` trong `next.config.ts`.
 */
const FLAME_STRIP = {
  /** Bằng đúng bề ngang thanh — ảnh đã được cắt theo mép thanh của ảnh gốc. */
  width: 200,
  /** Giữ đúng tỉ lệ 400×99 của file. */
  height: 50,
} as const;

/** Chiều cao dải lửa — quyết định khoảng trống phải chừa phía trên thanh. */
const FLAME_STRIP_HEIGHT = FLAME_STRIP.height;

/**
 * Thanh tiến độ nhỏ dưới ô "Hoàn thành" — dạng **bullet chart thu gọn**, không
 * phải gauge: bốn chỉ tiêu xếp dọc trong một cột hẹp thì gauge quá lớn.
 *
 * Thanh **không mang thông tin duy nhất**: con số `%` và nhãn chữ ngay trên nó
 * vẫn nói đủ (luật `color-not-only` của `docs/05 §4.4`). Nó là lớp giúp đọc
 * lướt — thứ sếp của người dùng yêu cầu.
 *
 * `PENDING` thì không vẽ gì: một pill rỗng dưới chữ `'—'` chỉ thêm nhiễu.
 *
 * ⚠ **`withFlame` — PHASE 19, DEC-070.** Cụm "Tình trạng thực hiện" gọi hàm này
 * với `false`, và đó là một quyết định về CHỖ chứ không về thẩm mỹ: chừa sẵn
 * `FLAME_STRIP_HEIGHT` (**50px** kể từ khi dải lửa thành ảnh PNG) trên mỗi thanh
 * × 4 dòng = **200px** chiều cao mà cụm không có để tiêu. Bật lửa ở cụm dưới thì
 * thẻ tràn 1920px và chữ chồng lên nhau (ISSUE-032). Bảng chính giữ nguyên lửa
 * vì nó là phần chính của tấm ảnh.
 */
function ProgressBar({
  progress,
  status,
  flameSrc,
  withFlame = true,
}: {
  progress: ShareCardProgress;
  status: AchievementStatus;
  flameSrc: string | null;
  withFlame?: boolean;
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
        height: withFlame ? FLAME_STRIP_HEIGHT + PROGRESS.height : PROGRESS.height,
        marginTop: withFlame ? 8 : 6,
      }}
    >
      {/* Lửa đứng TRƯỚC pill trong DOM ⇒ Satori vẽ nó xuống dưới, nên thanh đè
          lên chân lửa và dải trông như đang liếm lên từ dưới thanh.

          `flameSrc === null` nghĩa là không đọc được file ảnh: khi đó bỏ lửa
          nhưng **vẫn vẽ thanh**. Một tấm ảnh thiếu hiệu ứng vẫn dùng được; một
          tấm ảnh 500 thì không. */}
      {withFlame && progress.isBlazing && flameSrc !== null && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 0,
            // Chân lửa chìm 8px vào thân thanh, không đứng chông chênh trên mép.
            bottom: PROGRESS.height - 8,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori chỉ
              hiểu `<img>` thô; `next/image` là component của trình duyệt. */}
          <img
            src={flameSrc}
            width={FLAME_STRIP.width}
            height={FLAME_STRIP.height}
            alt=""
          />
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
  flameSrc,
}: {
  row: ShareCardMetricRow;
  zebra: boolean;
  variant: ShareCardModel['variant'];
  flameSrc: string | null;
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

          <ProgressBar
            progress={row.progress}
            status={row.achievement.status}
            flameSrc={flameSrc}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Một dòng của cụm "Tình trạng thực hiện" — PHASE 19, DEC-070.
 *
 * Dùng lại `ProgressBar` và `STATUS_COLOR` của bảng chính: hai cụm trên cùng
 * một tấm ảnh phải nói cùng một thứ tiếng màu, nếu không người đọc phải học hai
 * quy ước trong một lần nhìn.
 *
 * Không có nhãn chữ (`achievementLabel`) như bảng chính — cụm này đã có bốn
 * dòng và không còn chỗ theo chiều dọc. Luật `color-not-only` vẫn thoả: con số
 * `%` ngay đó là thông tin, màu chỉ là lớp nhấn.
 */
function PerformanceRow({ row }: { row: ShareCardPerformanceRow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          width: PERF_COLUMN.metric,
          fontSize: 26,
          color: COLOR.body,
        }}
      >
        {row.label}
      </div>

      <div
        style={{
          display: 'flex',
          width: PERF_COLUMN.target,
          justifyContent: 'flex-end',
          fontSize: 26,
          color: COLOR.muted,
          whiteSpace: 'nowrap',
        }}
      >
        {row.targetText}
      </div>

      <div
        style={{
          display: 'flex',
          width: PERF_COLUMN.actual,
          justifyContent: 'flex-end',
          fontSize: 26,
          fontWeight: 700,
          color: COLOR.body,
          whiteSpace: 'nowrap',
        }}
      >
        {row.actualText}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: PERF_COLUMN.achievement,
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 700,
            color: STATUS_COLOR[row.achievement.status],
            whiteSpace: 'nowrap',
          }}
        >
          {row.achievement.display}
        </div>

        {/* `withFlame={false}` — xem chú thích của `ProgressBar`: chừa chỗ cho
            lửa ở bốn dòng nữa là 200px mà cụm này không có.

            `flameSrc={null}` chứ không kéo data URI xuống tận đây: `withFlame`
            đã tắt lửa nên tấm ảnh 400×99 sẽ không bao giờ được vẽ, truyền nó
            xuống chỉ là một prop chết đi qua hai tầng component. */}
        <ProgressBar
          progress={row.progress}
          status={row.achievement.status}
          flameSrc={null}
          withFlame={false}
        />
      </div>
    </div>
  );
}

/**
 * Ba số liệu AMIS không có chỉ tiêu được gom thành một dải ngang. Nếu dựng như
 * ba dòng KPI giả với hai cột dấu gạch, thẻ vượt 1920px và mất footer.
 */
function SupplementaryMetrics({
  metrics,
}: {
  metrics: readonly ShareCardSupplementaryMetric[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderTop: `1px solid ${COLOR.accent}`,
        marginTop: 14,
        paddingTop: 12,
      }}
    >
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '33.333%',
            borderLeft: index === 0 ? '0px solid transparent' : `1px solid ${COLOR.rule}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              fontWeight: 600,
              color: COLOR.muted,
              letterSpacing: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {metric.label}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 700,
              color: COLOR.body,
              marginLeft: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {metric.valueText}
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  model: ShareCardModel;
  /**
   * Dải lửa dạng **data URI** (`data:image/png;base64,…`), do Route Handler đọc
   * từ đĩa rồi truyền xuống — component chạy trong Satori nên không có `fs`, và
   * Satori cũng không tải ảnh qua mạng lúc render (cùng lý do với font ở
   * ISSUE-002: một request hỏng là hỏng tấm ảnh đã gửi cho khách).
   *
   * `null` = không đọc được file ⇒ thẻ vẫn dựng, chỉ không có lửa.
   */
  flameSrc: string | null;
};

export function DailyReportShareCard({ model, flameSrc }: Props) {
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
          // Cỡ chữ do `shareNameFontSize()` quyết định để tên nằm gọn MỘT dòng
          // (PHASE 19). Đừng đặt lại hằng 64 ở đây — tên 2 dòng đẩy ghi chú,
          // chân thẻ rồi cả dòng cuối cụm AMIS ra khỏi khung 1920px.
          fontSize: model.nameFontSize,
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
          <div
            style={{
              display: 'flex',
              // Thu để tuyến không quá HAI dòng — `shareRouteFontSize()`. Tuyến
              // 104 ký tự ở cỡ 34px rơi xuống 3 dòng, đã render ra và đếm.
              fontSize: model.routeFontSize,
              color: COLOR.body,
              marginTop: 8,
              lineHeight: 1.4,
            }}
          >
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
          <MetricRow
            key={row.label}
            row={row}
            zebra={index % 2 === 1}
            variant={model.variant}
            flameSrc={flameSrc}
          />
        ))}

        <div style={{ display: 'flex', width: CONTENT_WIDTH, height: 1, backgroundColor: COLOR.rule }} />
      </div>

      {/* ── Tình trạng thực hiện — PHASE 19, DEC-070 ────────────────────────
          Ba trong bốn dòng lấy THỰC ĐẠT từ MISA AMIS, không phải từ số Sales tự
          khai. Chỗ này trước đây là cụm lũy kế tháng (DEC-068), và trước nữa là
          khối "Số khách làm việc" (DEC-056). Đừng khôi phục bản nào cũ. */}
      {model.performance !== null && (
        <div style={{ ...NO_SHRINK, display: 'flex', marginTop: 26 }}>
          {/* Vạch cam dọc: cam logo làm ĐỒ HOẠ, không mang chữ (DEC-046). */}
          <div style={{ display: 'flex', width: 10, backgroundColor: COLOR.accent }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              backgroundColor: COLOR.accentSoft,
              paddingTop: 22,
              paddingBottom: 24,
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
              {model.performance.title}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: COLOR.muted, marginTop: 6 }}>
              {model.performance.rangeText}
            </div>

            {/* Mảng chứ không Fragment — Satori không dựng được `<>…</>`. */}
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 16 }}>
              {PERFORMANCE_HEADER.map((cell) => (
                <SmallHeaderCell
                  key={cell.text === '' ? 'metric' : cell.text}
                  text={cell.text}
                  width={cell.width}
                  align={cell.align}
                />
              ))}
            </div>

            <div style={{ display: 'flex', height: 1, backgroundColor: COLOR.accent, marginTop: 6 }} />

            {model.performance.rows.map((row) => (
              <PerformanceRow key={row.label} row={row} />
            ))}

            <SupplementaryMetrics metrics={model.performance.supplementaryMetrics} />
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
            marginTop: 22,
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
            marginTop: 30,
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
