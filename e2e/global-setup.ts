import { seedE2eFixture, tearDownE2eFixture } from './fixtures';

/**
 * Dựng fixture trước khi bất kỳ spec nào chạy.
 *
 * Dọn TRƯỚC rồi mới dựng: nếu một lượt chạy trước bị `Ctrl+C` giữa chừng thì
 * `global-teardown` không chạy, và tài khoản cũ còn nằm lại. Bắt đầu bằng một
 * lượt dọn khiến bộ E2E chạy được nhiều lần liên tiếp mà không cần dọn tay.
 *
 * ⚠ **KHÔNG đóng pool ở đây.** `globalSetup` và `globalTeardown` chạy trong
 * cùng một tiến trình và dùng chung đúng một instance module `fixtures.ts`;
 * đóng pool ở bước dựng làm bước dọn ném `Cannot use a pool after calling end`
 * — và Playwright báo nó là "1 error was not a part of any test", tức là bộ
 * test vẫn "xanh" trong khi tài khoản E2E nằm lại trong database. Việc đóng
 * pool thuộc về `global-teardown.ts`.
 */
export default async function globalSetup(): Promise<void> {
  await tearDownE2eFixture();
  await seedE2eFixture();
}
