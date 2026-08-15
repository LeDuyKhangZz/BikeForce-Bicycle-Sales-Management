import { createClient } from "@/lib/supabase/server";
import { SalesReconciliation } from "@/features/sales-reconciliation/sales-reconciliation";
import type { ReconciliationRow } from "@/lib/reports/amis-reconciliation";

export const metadata = { title: "Đối chiếu AMIS" };

export default async function SalesReconciliationPage() {
  const supabase = await createClient();

  // RLS chỉ trả về dòng của chính người đang đăng nhập — không cần lọc thêm.
  const { data, error } = await supabase
    .from("amis_reconciliation")
    .select("*")
    .order("period_month", { ascending: false });

  if (error) {
    return (
      <main className="space-y-4 p-4 pb-24">
        <h1 className="text-lg font-semibold text-slate-900">Đối chiếu AMIS</h1>
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không đọc được dữ liệu: {error.message}
        </p>
      </main>
    );
  }

  const rows = (data ?? []) as unknown as ReconciliationRow[];

  return (
    <main className="space-y-4 p-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">Đối chiếu AMIS</h1>
        <p className="text-sm text-slate-600">
          Số bạn tự nhập so với số MISA AMIS ghi nhận, cộng theo từng tháng.
        </p>
      </header>

      <SalesReconciliation rows={rows} />
    </main>
  );
}