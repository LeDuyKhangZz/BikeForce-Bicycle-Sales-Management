import { cn } from '@/lib/utils';

/**
 * Thanh tiến độ của MỘT chỉ tiêu — PHASE 13 (DEC-053).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO THÊM — đây là thay đổi có ích nhất cho người dùng thật
 * ─────────────────────────────────────────────────────────────────────────
 *  Người dùng của app là Sales ngoài thị trường, **không mạnh về công nghệ**.
 *  Bản cũ bắt họ đọc `90.000.000 ₫` cạnh `100.000.000 ₫` rồi tự so trong đầu để
 *  biết mình gần đạt hay còn xa — mỗi ngày, bốn lần, trên màn hình 375px.
 *
 *  Một thanh dài ngắn trả lời câu đó trong **một phần tư giây**, trước cả khi
 *  mắt kịp đọc chữ số. Con số vẫn giữ nguyên bên cạnh; thanh chỉ là lớp đọc
 *  nhanh, không thay thế gì.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA RÀNG BUỘC KHÔNG ĐƯỢC PHÁ
 * ─────────────────────────────────────────────────────────────────────────
 *  1. **Không tự tính, không tự quyết ngưỡng.** `percent` do
 *     `calculateAchievement()` đưa xuống, `tone` do `getAchievementStatus()`
 *     quyết định (BR-023). Thanh này chỉ VẼ.
 *  2. **`percent = null` là trạng thái hợp lệ**, không phải lỗi: chưa có số
 *     liệu cuối ngày (PENDING), hoặc `target = 0 && actual > 0` (BR-015). Cả
 *     hai vẽ ra máng rỗng có gạch chéo mờ, KHÔNG vẽ thanh 0% — 0% nói sai rằng
 *     người dùng chưa làm được gì.
 *  3. **Chiều dài bị CHẶN ở 100%** dù `percent` lớn hơn (BR-004 cho phép
 *     `1.250,0%`). Máng chỉ dài chừng ấy; con số vượt đã hiện đầy đủ ở badge
 *     bên cạnh. Đây là giới hạn của **hình vẽ**, không phải clamp dữ liệu.
 *
 *  `aria-hidden` vì mọi thông tin ở đây đã có dạng chữ ngay cạnh (badge + hai
 *  con số). Cho screen reader đọc thêm một thanh nữa là lặp lại vô ích.
 */
type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const FILL_CLASS: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
};

export function ProgressBar({
  percent,
  tone,
  className,
}: {
  percent: number | null;
  tone: Tone;
  className?: string;
}) {
  const hasValue = percent !== null && Number.isFinite(percent);
  const width = hasValue ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-2 w-full overflow-hidden rounded-pill bg-background',
        'inset-ring inset-ring-border',
        className,
      )}
    >
      {hasValue ? (
        <div
          className={cn('h-full rounded-pill transition-[width] duration-500 ease-out-soft', FILL_CLASS[tone])}
          style={{ width: `${width}%` }}
        />
      ) : (
        // Máng rỗng có vân chéo — đọc ra "chưa có số liệu", khác hẳn "đạt 0%".
        <div className="h-full w-full bg-[repeating-linear-gradient(115deg,var(--color-border)_0_6px,transparent_6px_12px)]" />
      )}
    </div>
  );
}
