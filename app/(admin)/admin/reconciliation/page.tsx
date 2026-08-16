import { createClient } from "@/lib/supabase/server";
import { ReconciliationTable } from "@/features/admin-reconciliation/reconciliation-table";
import type { ReconciliationRow } from "@/lib/reports/amis-reconciliation";

export const metadata = { title: "Đối chiếu AMIS" };

export default async function ReconciliationPage() {
  const supabase = await createClient();

  // View dùng security_invoker -> RLS của người đang đăng nhập vẫn được áp.
  const { data, error } = await supabase
    .from("amis_reconciliation")
    .select("*")
    .order("period_month", { ascending: false })
    .order("full_name");

  if (error) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Đối chiếu AMIS</h1>
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không đọc được dữ liệu đối chiếu: {error.message}
        </p>
      </main>
    );
  }

  // View trả về nhiều cột nullable hơn kiểu ReconciliationRow mô tả,
  // nên phải ép qua unknown thay vì cast trực tiếp.
  const rows = (data ?? []) as unknown as ReconciliationRow[];
  const lastSync = rows.find((row) => row.synced_at)?.synced_at;

  return (
    <main className="space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Đối chiếu AMIS</h1>
        <p className="text-sm text-slate-600">
          So sánh số nhân viên tự nhập (cộng cả tháng) với số MISA AMIS ghi nhận.
          {lastSync && (
            <> Đồng bộ lần cuối: {new Date(lastSync).toLocaleString("vi-VN")}.</>
          )}
        </p>
      </header>

      <ReconciliationTable rows={rows} />
    </main>
  );
}