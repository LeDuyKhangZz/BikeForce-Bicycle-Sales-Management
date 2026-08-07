import { Card, CardTitle } from '@/components/ui/card';

/**
 * Trang tạm của PHASE 1 (Foundation).
 *
 * PHASE 2 sẽ thay thế bằng redirect theo vai trò: chưa đăng nhập → `/login`,
 * SALES → `/sales/today`, ADMIN → `/admin`. Hiện chưa có auth nên chưa
 * redirect được đi đâu cả.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-heading">BikeForce</h1>
      <p className="text-base text-muted-foreground">
        Báo cáo hiệu suất bán hàng theo ngày cho đội Sales xe đạp.
      </p>
      <Card>
        <CardTitle>Phase 1 — Foundation</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Nền tảng dự án đã dựng xong. Đăng nhập và báo cáo hằng ngày sẽ có ở Phase 2.
        </p>
      </Card>
    </main>
  );
}
