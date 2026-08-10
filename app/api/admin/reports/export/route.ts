import { NextResponse, type NextRequest } from 'next/server';

import { getCurrentProfile } from '@/features/auth/queries';
import { getVietnamToday } from '@/lib/date';
import { parseAdminReportFilters } from '@/lib/reports/admin-filters';
import { buildCsv, csvFileName } from '@/lib/reports/csv';
import { KPI_METRIC_ROWS } from '@/lib/reports/metric-rows';
import { REPORT_STATUS_LABEL } from '@/lib/reports/report-status';
import { createClient } from '@/lib/supabase/server';
import { CSV_EXPORT_MAX_ROWS, getAdminReportsForExport } from '@/services/reports';

/**
 * `GET /api/admin/reports/export` — FR-034, UC-21, AF-09.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO ĐÂY LÀ ROUTE HANDLER THỨ HAI CỦA DỰ ÁN — DEC-042
 * ─────────────────────────────────────────────────────────────────────────
 *  DEC-003 nói "không REST API riêng cho CRUD báo cáo", và điều đó vẫn đúng:
 *  đây không phải CRUD, nó là **một file tải về**. Cùng lý do đã cho phép
 *  `GET /api/reports/[id]/share-image` tồn tại ở Phase 6 — Server Action không
 *  đặt được `Content-Disposition`, không stream được nội dung không phải HTML,
 *  và không cho trình duyệt biết "đây là file, hãy lưu lại".
 *
 *  Phương án thay thế đã cân nhắc: Server Action trả chuỗi CSV rồi client dựng
 *  `Blob`. Bỏ vì nó đẩy toàn bộ nội dung qua payload của action (giới hạn 1 MB
 *  mặc định của Next), và vì tải file là đúng việc của một GET có thể bookmark.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BẢO MẬT
 * ─────────────────────────────────────────────────────────────────────────
 *  Route này trả **dữ liệu của toàn đội**, nên nó là bề mặt nhạy cảm nhất trong
 *  ba route API. Ba lớp, không lớp nào thay được lớp nào:
 *    1. `middleware.ts` trả **401 JSON** cho `/api/*` khi chưa đăng nhập
 *       (DEC-039 — không redirect, vì `fetch` sẽ đi theo redirect và lưu HTML
 *       thành file `.csv` hỏng, đúng lỗi ISSUE-015 của Phase 6);
 *    2. kiểm `role === 'ADMIN'` ngay tại đây, trả **403 JSON**;
 *    3. RLS `reports_select_own_or_admin` vẫn đứng dưới cùng — kể cả khi hai
 *       lớp trên bị viết sai, một Sales cũng chỉ xuất được báo cáo của mình.
 *
 *  `private, no-store` bắt buộc: file này chứa doanh thu toàn đội, không được
 *  nằm lại trong cache của CDN hay của trình duyệt (`docs/07 §4.1`).
 */

export const runtime = 'nodejs';
/**
 * Cùng vùng với database Singapore — ISSUE-019. Route segment config KHÔNG lan
 * từ `app/layout.tsx` xuống Route Handler, nên phải khai lại ở đây.
 */
export const preferredRegion = 'sin1';


export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();

  // Lớp 2. Middleware đã chặn phiên rỗng, nhưng route phải tự đứng được
  // (NFR-006 — defense in depth là bắt buộc, không tuỳ chọn).
  if (profile === null) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
      { status: 401 },
    );
  }

  if (!profile.is_active) {
    return NextResponse.json(
      { code: 'ACCOUNT_DISABLED', message: 'Tài khoản của bạn đã bị vô hiệu hoá.' },
      { status: 403 },
    );
  }

  if (profile.role !== 'ADMIN') {
    return NextResponse.json(
      { code: 'FORBIDDEN', message: 'Bạn không có quyền xuất dữ liệu này.' },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  // Cùng MỘT hàm phân tích bộ lọc với `/admin/reports`. Đây là điều kiện để
  // file CSV khớp đúng bảng đang hiển thị (FR-034) — hai bộ phân tích song song
  // là cách chắc chắn nhất để chúng lệch nhau.
  const filters = parseAdminReportFilters({
    date: params.get('date') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    month: params.get('month') ?? undefined,
    salesId: params.get('salesId') ?? undefined,
    status: params.get('status') ?? undefined,
    q: params.get('q') ?? undefined,
  });

  const supabase = await createClient();
  const { rows, truncated } = await getAdminReportsForExport(supabase, filters);

  const csv = buildCsv(CSV_HEADERS, rows.map(toCsvRow));
  const fileName = csvFileName('BikeForce Reports', getVietnamToday());

  const headers = new Headers({
    // `charset=utf-8` cộng BOM trong nội dung: hai lớp cho cùng một việc, vì
    // Excel bỏ qua header và chỉ nhìn BOM.
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'private, no-store',
  });

  // Cắt im lặng sẽ khiến người nhận tưởng mình có đủ dữ liệu. Nói ra bằng một
  // header đọc được, và giao diện cũng cảnh báo trước khi bấm.
  if (truncated) {
    headers.set('X-BikeForce-Truncated', String(CSV_EXPORT_MAX_ROWS));
  }

  return new NextResponse(csv, { status: 200, headers });
}

/**
 * Cột của file CSV. Bốn chỉ tiêu lấy nhãn từ `KPI_METRIC_ROWS` — nguồn DUY NHẤT
 * của "4 chỉ tiêu là gì" (Phase 6). Thêm một chỉ tiêu ở đó thì file CSV tự có
 * thêm cột, không phải sửa hai chỗ.
 */
const CSV_HEADERS: readonly string[] = [
  'Ngày',
  'Nhân viên',
  'Mã nhân viên',
  'Trạng thái',
  ...KPI_METRIC_ROWS.flatMap((row) => [`${row.label} - cam kết`, `${row.label} - thực đạt`]),
];

type ExportRow = Awaited<ReturnType<typeof getAdminReportsForExport>>['rows'][number];

/**
 * Một dòng dữ liệu. Số đi ra dưới dạng **số thô**, không format:
 * `125.000.000 ₫` là chuỗi, và Excel không cộng được một cột chuỗi (BR-010).
 * `report_date` giữ nguyên `YYYY-MM-DD` để sắp xếp đúng thứ tự trong Excel.
 */
function toCsvRow(report: ExportRow): ReadonlyArray<string | number | null> {
  return [
    report.report_date,
    report.sales.full_name,
    report.sales.employee_code,
    REPORT_STATUS_LABEL[report.status],
    ...KPI_METRIC_ROWS.flatMap((row) => [report[row.targetColumn], report[row.actualColumn]]),
  ];
}
