import { achievementLabel, type AchievementStatus } from '@/lib/kpi';
import type { ShareCardMetricRow, ShareCardModel } from '@/lib/reports/share-card';

/**
 * Thẻ ảnh chia sẻ 9:16 — bố cục `docs/05 §14`, render bằng **Satori** trong
 * `app/api/reports/[id]/share-image/route.ts` (DEC-010, FR-018).
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
 */

/** Bảng màu dark cố định của thẻ ảnh — `docs/05 §4.5`, đã đo contrast trên `#0B1220`. */
const COLOR = {
  background: '#0B1220',
  heading: '#FFFFFF',
  body: '#CBD5E1',
  muted: '#94A3B8',
  brand: '#FBBF24',
  exceeded: '#4ADE80',
  missed: '#F87171',
  info: '#60A5FA',
  rule: '#1E3A8A',
} as const;

/**
 * `status → màu`. `NEAR` dùng màu thương hiệu vì bảng `docs/05 §4.5` không có
 * token vàng thứ hai; `PENDING` dùng màu nhãn vì "chưa có số liệu" không phải
 * một kết quả tốt hay xấu.
 *
 * Màu KHÔNG BAO GIỜ là thông tin duy nhất (`docs/05 §4.4` — quy tắc
 * `color-not-only`): mỗi ô "Hoàn thành" luôn kèm nhãn chữ của `achievementLabel()`.
 * Ảnh gửi qua Zalo còn bị nén màu, nên đây là ràng buộc thật chứ không hình thức.
 */
const STATUS_COLOR: Record<AchievementStatus, string> = {
  EXCEEDED: COLOR.exceeded,
  NEAR: COLOR.brand,
  MISSED: COLOR.missed,
  PENDING: COLOR.muted,
};

/** Bề rộng bốn cột, cộng lại đúng 984px = 1080 trừ hai lề 48px. */
const COLUMN_WIDTH = {
  metric: 280,
  target: 200,
  actual: 200,
  achievement: 304,
} as const;

const ROW_BORDER = `1px solid ${COLOR.rule}`;

function HeaderCell({ text, width, align }: { text: string; width: number; align: 'left' | 'right' }) {
  return (
    <div
      style={{
        display: 'flex',
        width,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        fontSize: 26,
        color: COLOR.muted,
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
}

function MetricRow({ row }: { row: ShareCardMetricRow }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        paddingTop: 22,
        paddingBottom: 22,
        borderTop: ROW_BORDER,
      }}
    >
      <div style={{ display: 'flex', width: COLUMN_WIDTH.metric, fontSize: 34, color: COLOR.body }}>
        {row.label}
      </div>
      <div
        style={{
          display: 'flex',
          width: COLUMN_WIDTH.target,
          justifyContent: 'flex-end',
          fontSize: 34,
          color: COLOR.body,
        }}
      >
        {row.targetText}
      </div>
      <div
        style={{
          display: 'flex',
          width: COLUMN_WIDTH.actual,
          justifyContent: 'flex-end',
          fontSize: 34,
          fontWeight: 600,
          color: COLOR.heading,
        }}
      >
        {row.actualText}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: COLUMN_WIDTH.achievement,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: STATUS_COLOR[row.achievement.status] }}>
          {row.achievement.display}
        </div>
        {/* Nhãn chữ — thứ giữ cho thông tin không phụ thuộc vào màu. */}
        <div style={{ display: 'flex', fontSize: 22, color: COLOR.muted, marginTop: 4 }}>
          {achievementLabel(row.achievement)}
        </div>
      </div>
    </div>
  );
}

type Props = {
  model: ShareCardModel;
};

export function DailyReportShareCard({ model }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1080,
        height: 1920,
        backgroundColor: COLOR.background,
        color: COLOR.heading,
        // Tên này phải trùng `fonts[].name` truyền cho `ImageResponse`.
        fontFamily: 'Inter',
        paddingTop: 64,
        paddingBottom: 48,
        paddingLeft: 48,
        paddingRight: 48,
      }}
    >
      {/* ── Thương hiệu ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: COLOR.brand, letterSpacing: 2 }}>
        BIKEFORCE
      </div>
      <div style={{ display: 'flex', fontSize: 28, color: COLOR.muted, letterSpacing: 6, marginTop: 8 }}>
        DAILY SALES REPORT
      </div>
      <div style={{ display: 'flex', height: 2, backgroundColor: COLOR.rule, marginTop: 24 }} />

      {/* ── Ngày nghiệp vụ (BR-005) ────────────────────────────────────── */}
      <div style={{ display: 'flex', fontSize: 36, color: COLOR.body, marginTop: 32 }}>{model.dateText}</div>

      {/* ── Sales ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, marginTop: 24, lineHeight: 1.2 }}>
        {model.salesName}
      </div>
      {model.employeeCode !== null && (
        <div style={{ display: 'flex', fontSize: 28, color: COLOR.muted, marginTop: 8 }}>
          {model.employeeCode}
        </div>
      )}

      {model.routeText !== null && (
        <div style={{ display: 'flex', fontSize: 32, color: COLOR.body, marginTop: 24, lineHeight: 1.4 }}>
          {`Tuyến: ${model.routeText}`}
        </div>
      )}

      {/* ── Bảng đối chiếu 4 chỉ tiêu ──────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 12 }}>
          <HeaderCell text="CHỈ TIÊU" width={COLUMN_WIDTH.metric} align="left" />
          <HeaderCell text="CAM KẾT" width={COLUMN_WIDTH.target} align="right" />
          <HeaderCell text="THỰC ĐẠT" width={COLUMN_WIDTH.actual} align="right" />
          <HeaderCell text="HOÀN THÀNH" width={COLUMN_WIDTH.achievement} align="right" />
        </div>
        {model.metrics.map((row) => (
          <MetricRow key={row.label} row={row} />
        ))}
      </div>

      {/* ── Doanh thu thực đạt, dạng ĐẦY ĐỦ ────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
        <div style={{ display: 'flex', fontSize: 28, color: COLOR.muted, letterSpacing: 3 }}>
          DOANH THU THỰC ĐẠT
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, marginTop: 8 }}>
          {model.revenueActualText}
        </div>
      </div>

      {/* ── Ghi chú cuối ngày ──────────────────────────────────────────── */}
      {model.noteText !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <div style={{ display: 'flex', fontSize: 26, color: COLOR.muted }}>Ghi chú</div>
          <div style={{ display: 'flex', fontSize: 30, color: COLOR.body, marginTop: 8, lineHeight: 1.45 }}>
            {model.noteText}
          </div>
        </div>
      )}

      {/* `marginTop: auto` đẩy footer xuống đáy dù nội dung trên dài hay ngắn. */}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
        <div style={{ display: 'flex', height: 2, backgroundColor: COLOR.rule }} />
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
