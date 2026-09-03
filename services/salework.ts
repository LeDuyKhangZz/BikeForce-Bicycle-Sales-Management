import { createClient } from '@supabase/supabase-js';

export type SaleWorkReport = {
  accountName: string;
  conversations: number;
  sentMessages: number;
  receivedMessages: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  callDuration: string;
  // --- Số liệu AMIS (có thể null nếu chưa map được nhân viên hoặc chưa có dữ liệu tháng này) ---
  amis: {
    netSales: number;
    sales: number;
    returnSales: number;
    noOfOrders: number;
    targetAmount: number | null;
    currentAmount: number;
    syncedAt: string;
  } | null;
};

// Kiểu dữ liệu thô trả về từ Supabase (snake_case, đúng tên cột trong bảng).
type SaleWorkReportRow = {
  account_name: string;
  conversations: number;
  sent_messages: number;
  received_messages: number;
  incoming_calls: number;
  outgoing_calls: number;
  missed_calls: number;
  call_duration: string;
};

type AmisEmployeeMetricRow = {
  employee_name: string;
  net_sales: number | null;
  sales: number | null;
  return_sales: number | null;
  no_of_orders: number | null;
  target_amount: number | null;
  current_amount: number | null;
  synced_at: string;
};

/**
 * Map tên tài khoản SaleWork (Zalo) -> tên nhân viên trong AMIS (report 119).
 * Hai hệ thống đặt tên khác nhau nên phải khai báo tay tại đây.
 * Thêm dòng mới khi có tài khoản SaleWork mới cần gắn số liệu AMIS.
 */
export const AMIS_EMPLOYEE_MAP: Record<string, string> = {
  'Abraham Kế Toán Bánhàng': 'Kế Toán Bán Hàng',
  'Giao - Kế Toán bán hàng': 'Trần Thị Quỳnh Giao',
};

/**
 * ⚠ Dùng BIKEFORCE_SERVICE_ROLE_KEY (không phải anon key) vì hàm này CHỈ chạy
 * ở phía server (Server Component / Route Handler, không có "use client").
 * Service role key bỏ qua Row Level Security — an toàn ở đây vì không bao giờ
 * lộ ra trình duyệt. TUYỆT ĐỐI không import file này vào component client.
 */
function getSupabaseAdminClient() {
  const url = process.env.BIKEFORCE_SUPABASE_URL;
  const serviceRoleKey = process.env.BIKEFORCE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Thiếu biến môi trường BIKEFORCE_SUPABASE_URL hoặc BIKEFORCE_SERVICE_ROLE_KEY. ' +
        'Kiểm tra .env.local (dev) hoặc Vercel → Environment Variables (production).',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function toSaleWorkReport(row: SaleWorkReportRow): Omit<SaleWorkReport, 'amis'> {
  return {
    accountName: row.account_name,
    conversations: row.conversations,
    sentMessages: row.sent_messages,
    receivedMessages: row.received_messages,
    incomingCalls: row.incoming_calls,
    outgoingCalls: row.outgoing_calls,
    missedCalls: row.missed_calls,
    callDuration: row.call_duration,
  };
}

function toAmisData(row: AmisEmployeeMetricRow): SaleWorkReport['amis'] {
  return {
    netSales: row.net_sales ?? 0,
    sales: row.sales ?? 0,
    returnSales: row.return_sales ?? 0,
    noOfOrders: row.no_of_orders ?? 0,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount ?? 0,
    syncedAt: row.synced_at,
  };
}

/** '2026-08-01' cho tháng hiện tại theo giờ VN — khớp cách push_amis.py ghi period_month. */
function currentPeriodMonth(): string {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = vnNow.getFullYear();
  const m = String(vnNow.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * ✅ Đã chuyển từ đọc file data/salework-report.json (chỉ tồn tại cục bộ,
 * không có trên Vercel) sang đọc từ bảng Supabase — nơi cả localhost và
 * production đều đọc chung một nguồn dữ liệu thật.
 *
 * Giờ còn join thêm số liệu AMIS (amis_employee_metrics) theo tháng hiện tại,
 * qua bảng mapping tĩnh AMIS_EMPLOYEE_MAP.
 */
export async function getSaleWorkReport(): Promise<SaleWorkReport[]> {
  try {
    const supabase = getSupabaseAdminClient();

    const { data: saleworkData, error: saleworkError } = await supabase
      .from('salework_reports')
      .select('*')
      .order('account_name', { ascending: true });

    if (saleworkError) {
      console.error('[getSaleWorkReport] Lỗi truy vấn salework_reports:', saleworkError.message);
      return [];
    }

    const baseReports = (saleworkData ?? []).map(toSaleWorkReport);

    // Lấy số liệu AMIS của tháng hiện tại cho các nhân viên đã map.
    const employeeNames = Array.from(new Set(Object.values(AMIS_EMPLOYEE_MAP)));
    const period = currentPeriodMonth();

    const { data: amisData, error: amisError } = await supabase
      .from('amis_employee_metrics')
      .select('*')
      .eq('period_month', period)
      .in('employee_name', employeeNames);

    if (amisError) {
      console.error('[getSaleWorkReport] Lỗi truy vấn amis_employee_metrics:', amisError.message);
    }

    const amisByEmployeeName = new Map<string, AmisEmployeeMetricRow>();
    for (const row of amisData ?? []) {
      amisByEmployeeName.set(row.employee_name, row as AmisEmployeeMetricRow);
    }

    return baseReports.map((report) => {
      const employeeName = AMIS_EMPLOYEE_MAP[report.accountName];
      const amisRow = employeeName ? amisByEmployeeName.get(employeeName) : undefined;
      return {
        ...report,
        amis: amisRow ? toAmisData(amisRow) : null,
      };
    });
  } catch (error) {
    console.error('[getSaleWorkReport]', error instanceof Error ? error.message : error);
    return [];
  }
}
