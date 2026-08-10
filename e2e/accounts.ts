/**
 * Danh mục tài khoản E2E — **thuần hằng số**, không import `pg` hay
 * `@supabase/supabase-js`.
 *
 * Tách khỏi `e2e/fixtures.ts` là có chủ đích: file kia mở một `Pool` Postgres
 * ngay lúc nạp module. Spec nào chỉ cần biết *email* mà lỡ import nó sẽ mở thêm
 * một pool trong tiến trình test và giữ kết nối suốt lượt chạy.
 */

/** Ba project của `playwright.config.ts`. Mỗi project một Sales "luồng" riêng. */
export const E2E_PROJECTS = ['mobile-375', 'desktop-1440', 'zalo-like'] as const;
export type E2eProject = (typeof E2E_PROJECTS)[number];

/** Mọi email E2E mang hậu tố này để `global-teardown` dọn sạch không sót. */
const E2E_DOMAIN = 'e2e.bikeforce.test';

export const E2E_ADMIN_EMAIL = `admin@${E2E_DOMAIN}`;

/** Sales đã `COMPLETED` hôm nay + có lịch sử tháng trước. Chỉ ĐỌC, dùng chung. */
export const E2E_DONE_SALES_EMAIL = `done@${E2E_DOMAIN}`;
export const E2E_DONE_SALES_NAME = 'E2E Đã Hoàn Tất';

/** Sales của project `p` — mỗi lượt chạy bắt đầu từ trạng thái "chưa báo cáo". */
export const flowSalesEmail = (project: E2eProject): string => `flow-${project}@${E2E_DOMAIN}`;

/** Email mà kịch bản UC-17 tạo mới — riêng theo project để không đụng nhau. */
export const createdSalesEmail = (project: E2eProject): string => `new-${project}@${E2E_DOMAIN}`;

/** Ép tên project của Playwright về kiểu hẹp, ném lỗi rõ ràng nếu lệch cấu hình. */
export function toE2eProject(projectName: string): E2eProject {
  const found = E2E_PROJECTS.find((name) => name === projectName);
  if (found === undefined) throw new Error(`Project E2E không rõ: ${projectName}`);
  return found;
}
