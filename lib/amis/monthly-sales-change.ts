export type MonthlySalesChange =
  | { kind: 'UP' | 'DOWN' | 'SAME'; percent: number; display: string }
  | { kind: 'NEW'; percent: null; display: string }
  | { kind: 'UNKNOWN'; percent: null; display: string };

export function calculateMonthlySalesChange(
  current: number | null,
  previous: number | null,
): MonthlySalesChange {
  if (current === null || previous === null) {
    return { kind: 'UNKNOWN', percent: null, display: 'Chưa có dữ liệu tháng trước' };
  }
  if (previous === 0) {
    if (current === 0) return { kind: 'SAME', percent: 0, display: 'Không đổi' };
    return { kind: 'NEW', percent: null, display: 'Mới phát sinh' };
  }
  const percent = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(percent) * 10) / 10;
  const formatted = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rounded);
  if (percent > 0) return { kind: 'UP', percent, display: `Tăng ${formatted}%` };
  if (percent < 0) return { kind: 'DOWN', percent, display: `Giảm ${formatted}%` };
  return { kind: 'SAME', percent: 0, display: 'Không đổi' };
}
