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

function toSaleWorkReport(row: SaleWorkReportRow): SaleWorkReport {
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

/**
 * ✅ Đã chuyển từ đọc file data/salework-report.json (chỉ tồn tại cục bộ,
 * không có trên Vercel) sang đọc từ bảng Supabase — nơi cả localhost và
 * production đều đọc chung một nguồn dữ liệu thật.
 *
 * Vì đây là lệnh gọi mạng, hàm giờ là async — MỌI nơi gọi getSaleWorkReport()
 * phải thêm await.
 */
export async function getSaleWorkReport(): Promise<SaleWorkReport[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('salework_reports')
      .select('*')
      .order('account_name', { ascending: true });

    if (error) {
      console.error('[getSaleWorkReport] Lỗi truy vấn Supabase:', error.message);
      return [];
    }

    return (data ?? []).map(toSaleWorkReport);
  } catch (error) {
    console.error('[getSaleWorkReport]', error instanceof Error ? error.message : error);
    return [];
  }
}