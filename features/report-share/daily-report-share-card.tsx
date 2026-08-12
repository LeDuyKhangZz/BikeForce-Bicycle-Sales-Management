import { achievementLabel, type AchievementStatus } from '@/lib/kpi';
import type { ShareCardMetricRow, ShareCardModel } from '@/lib/reports/share-card';

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
 *    và `EVENING` (bảng 4 cột + khối "Số khách làm việc"). Biến thể do
 *    `model.variant` quyết định ở tầng dữ liệu; component không tự đoán.
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
 * Nhịp chữ của bảng, KHÁC NHAU giữa hai biến thể — và đây là cỡ chữ đã sửa sau
 * khi **nhìn tận mắt hai tấm PNG render ra**.
 *
 * Bản đầu tiên dùng chung một cỡ cho cả hai: bản chiều còn tạm, nhưng bản sáng
 * chỉ có 4 con số nên nội dung kết thúc ở khoảng 1030/1920 — gần **nửa tấm ảnh
 * là khoảng trắng**, trông như ảnh bị lỗi chứ không như một thiết kế thoáng.
 * Bản sáng vì thế đọc như một tấm áp phích: dòng cao, số to.
 *
 * Bài học DEC-053 lặp lại: bốn nhóm luật đo được đều xanh mà mắt vẫn thấy sai.
 */
const ROW_METRICS = {
  MORNING: { paddingY: 70, label: 42, value: 56 },
  EVENING: { paddingY: 30, label: 36, value: 36 },
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
        fontSize: 34,
        fontWeight: 700,
        color: COLOR.muted,
        letterSpacing: 1,
      }}
    >
      {text}
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
        style={{ display: 'flex', width: 132, height: 10, backgroundColor: COLOR.accent }}
      />
      <div
        style={{
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
        style={{ display: 'flex', height: 3, backgroundColor: COLOR.heading, marginTop: 26 }}
      />

      {/* ── Ngày nghiệp vụ (BR-005) ────────────────────────────────────────── */}
      <div style={{ display: 'flex', fontSize: 36, color: COLOR.muted, marginTop: 32 }}>
        {model.dateText}
      </div>

      {/* ── Sales ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          fontSize: 64,
          fontWeight: 700,
          color: COLOR.heading,
          marginTop: 12,
          lineHeight: 1.2,
        }}
      >
        {model.salesName}
      </div>
      {model.employeeCode !== null && (
        <div style={{ display: 'flex', fontSize: 30, color: COLOR.muted, marginTop: 8 }}>
          {model.employeeCode}
        </div>
      )}

      {model.routeText !== null && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 32,
            paddingTop: 26,
            paddingBottom: 26,
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
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
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

      {/* ── Khối nhấn mạnh: "Số khách làm việc" — chỉ có ở bản CHIỀU ────────── */}
      {model.workRate !== null && (
        <div style={{ display: 'flex', marginTop: 40 }}>
          {/* Vạch cam dọc: cam logo làm ĐỒ HOẠ, không mang chữ (DEC-046). */}
          <div style={{ display: 'flex', width: 10, backgroundColor: COLOR.accent }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              backgroundColor: COLOR.accentSoft,
              paddingTop: 34,
              paddingBottom: 34,
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
              }}
            >
              SỐ KHÁCH LÀM VIỆC
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 6 }}>
              <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, color: COLOR.body }}>
                {model.workRate.display}
              </div>
              {model.workRate.detailText !== null && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 28,
                    color: COLOR.muted,
                    marginLeft: 20,
                    paddingBottom: 16,
                  }}
                >
                  {model.workRate.detailText}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ghi chú cuối ngày ──────────────────────────────────────────────── */}
      {model.noteText !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
          <div style={{ display: 'flex', fontSize: 26, color: COLOR.muted, letterSpacing: 3 }}>
            GHI CHÚ
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: COLOR.body, marginTop: 10, lineHeight: 1.45 }}>
            {model.noteText}
          </div>
        </div>
      )}

      {/* Bản sáng nói rõ đây mới là một nửa câu chuyện — người nhận trên Zalo
          không có ngữ cảnh nào khác ngoài tấm ảnh này (DEC-058). */}
      {isMorning && (
        <div style={{ display: 'flex', fontSize: 32, color: COLOR.muted, marginTop: 44, lineHeight: 1.4 }}>
          Kết quả thực đạt sẽ được gửi vào cuối ngày.
        </div>
      )}

      {/* `marginTop: auto` đẩy footer xuống đáy dù nội dung trên dài hay ngắn. */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
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
