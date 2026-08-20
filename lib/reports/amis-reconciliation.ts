/** Một dòng đối chiếu số sales tự nhập với số AMIS ghi nhận. */
export type ReconciliationRow = {
  sales_id: string | null;
  full_name: string | null;
  employee_code: string | null;
  period_month: string;
  completed_days: number;

  reported_revenue: number | null;
  amis_revenue: number | null;
  revenue_diff: number | null;

  reported_customer_visits: number | null;
  amis_customer_visits: number | null;
  customer_visits_diff: number | null;

  reported_sales_quantity: number | null;
  amis_orders: number | null;
  orders_diff: number | null;

  amis_receivable: number | null;
  amis_target: number | null;
  amis_current: number | null;
  synced_at: string | null;

  /** Có trên AMIS nhưng chưa có tài khoản BikeForce (hoặc chưa map tên). */
  amis_only: boolean;
  /** Có báo cáo trong BikeForce nhưng không tìm thấy trên AMIS. */
  bikeforce_only: boolean;
};

/** Ngưỡng cảnh báo: lệch quá 10% doanh thu thì đáng xem lại. */
export const REVENUE_VARIANCE_THRESHOLD = 0.1;

export type RowKind = "matched" | "amis_only" | "bikeforce_only";

export function rowKind(row: ReconciliationRow): RowKind {
  if (row.amis_only) return "amis_only";
  if (row.bikeforce_only) return "bikeforce_only";
  return "matched";
}

/**
 * Tỉ lệ lệch so với số AMIS.
 * Trả null khi thiếu một phía hoặc số AMIS bằng 0 (chia cho 0 vô nghĩa).
 */
export function variancePercent(row: ReconciliationRow): number | null {
  if (row.revenue_diff === null) return null;
  if (row.amis_revenue === null || row.amis_revenue === 0) return null;
  return row.revenue_diff / row.amis_revenue;
}

export type VarianceLevel = "incomparable" | "ok" | "warning";

export function varianceLevel(row: ReconciliationRow): VarianceLevel {
  const percent = variancePercent(row);
  if (percent === null) return "incomparable";
  return Math.abs(percent) > REVENUE_VARIANCE_THRESHOLD ? "warning" : "ok";
}

/** Danh sách kỳ có dữ liệu, mới nhất trước. */
export function listPeriods(rows: ReconciliationRow[]): string[] {
  return [...new Set(rows.map((row) => row.period_month))].sort().reverse();
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `Tháng ${month}/${year}`;
}