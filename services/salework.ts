import { createClient } from '@supabase/supabase-js';

import { getVietnamCurrentMonth } from '@/lib/date';
import {
  combineCallMetrics,
  parseSaleWorkDurationSeconds,
} from '@/lib/salework/call-metrics';

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

const CRM_CALL_ROW_PREFIX = '__CRM70__:';
const CRM_CALL_EMPLOYEE_CODE_MAP: Record<string, string> = {
  'Giao - Kế Toán bán hàng': 'VP-TLS-003',
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

function combineReportCalls(
  report: Omit<SaleWorkReport, 'amis'>,
  row: SaleWorkReportRow | undefined,
) {
  return combineCallMetrics(
    report,
    row
      ? {
          totalQuantity: row.conversations,
          calledQuantity: row.outgoing_calls,
          incomingSuccessful: row.incoming_calls,
          outgoingDurationSeconds: parseSaleWorkDurationSeconds(row.call_duration),
        }
      : null,
  );
}

/** '2026-08-01' cho tháng hiện tại theo giờ VN — khớp cách push_amis.py ghi period_month. */
function currentPeriodMonth(): string {
  return `${getVietnamCurrentMonth()}-01`;
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
      .select(
        'account_name,conversations,sent_messages,received_messages,incoming_calls,outgoing_calls,missed_calls,call_duration',
      )
      .order('account_name', { ascending: true });

    if (saleworkError) {
      console.error('[getSaleWorkReport] Lỗi truy vấn salework_reports:', saleworkError.message);
      return [];
    }

    const period = currentPeriodMonth();
    const allSaleWorkRows: SaleWorkReportRow[] = saleworkData ?? [];
    const baseReports = allSaleWorkRows
      .filter((row) => !row.account_name.startsWith(CRM_CALL_ROW_PREFIX))
      .map(toSaleWorkReport);
    const crmCallsByEmployeeCode = new Map<string, SaleWorkReportRow>();
    for (const row of allSaleWorkRows) {
      if (row.account_name.startsWith(CRM_CALL_ROW_PREFIX)) {
        crmCallsByEmployeeCode.set(row.account_name.slice(CRM_CALL_ROW_PREFIX.length), row);
      }
    }

    // Lấy số liệu AMIS của tháng hiện tại cho các nhân viên đã map.
    const employeeNames = Array.from(new Set(Object.values(AMIS_EMPLOYEE_MAP)));
    const { data: amisData, error: amisError } = await supabase
      .from('amis_employee_metrics')
      .select(
        'employee_name,net_sales,sales,return_sales,no_of_orders,target_amount,current_amount,synced_at',
      )
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
      const employeeCode = CRM_CALL_EMPLOYEE_CODE_MAP[report.accountName];
      const callRow = employeeCode
        ? crmCallsByEmployeeCode.get(`${period}:${employeeCode}`)
        : undefined;
      return {
        ...report,
        ...combineReportCalls(report, callRow),
        amis: amisRow ? toAmisData(amisRow) : null,
      };
    });
  } catch (error) {
    console.error('[getSaleWorkReport]', error instanceof Error ? error.message : error);
    return [];
  }
}

/** Đọc một tài khoản đã biết tên; dùng cho việc ghép số SaleWork vào báo cáo Sales. */
export async function getSaleWorkReportByAccountName(
  accountName: string,
): Promise<SaleWorkReport | null> {
  const reports = await getSaleWorkReport();
  return reports.find((report) => report.accountName === accountName) ?? null;
}
