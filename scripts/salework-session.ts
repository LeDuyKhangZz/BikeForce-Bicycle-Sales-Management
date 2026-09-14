import type { Page, WebSocket } from '@playwright/test';
import { isSaleWorkSessionSubscription } from '../lib/salework/session-subscription';

export async function aggregateSaleWorkReport(page: Page): Promise<void> {
  const responsePromise = page.waitForResponse(response => {
    if (new URL(response.url()).pathname !== '/api/statistic/overview') return false;
    const body: unknown = response.request().postDataJSON();
    return typeof body === 'object' && body !== null &&
      'statisticType' in body && body.statisticType === 'conversation';
  }, { timeout: 60_000 });
  // Gắn handler ngay cả khi click lỗi để waiter không tạo rejection chưa xử lý.
  void responsePromise.catch(() => {});
  await page.getByRole('button', { name: 'Tổng hợp' }).click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`SaleWork Tổng hợp trả HTTP ${response.status()}.`);
  // HTTP chỉ trả số tác vụ; bảng được dựng sau các kết quả WebSocket.
  await page.getByText(/Đang tải dữ liệu\s/u).first().waitFor({ state: 'hidden', timeout: 180_000 });
  await page.locator('.el-loading-mask:visible').first().waitFor({ state: 'hidden', timeout: 180_000 });
}

/** Theo dõi trước goto để không bỏ lỡ frame đăng ký phiên. */
export function watchSaleWorkSession(page: Page): () => Promise<void> {
  const subscribedSockets = new Set<WebSocket>();
  page.on('websocket', socket => {
    const url = new URL(socket.url());
    if (url.hostname !== 'zalo.salework.net' || !url.pathname.startsWith('/websocket/')) return;
    socket.on('framesent', frame => {
      if (isSaleWorkSessionSubscription(frame.payload)) subscribedSockets.add(socket);
    });
    socket.on('close', () => subscribedSockets.delete(socket));
  });
  return async () => {
    const deadline = Date.now() + 60_000;
    while (subscribedSockets.size === 0 && Date.now() < deadline) {
      await page.waitForTimeout(250);
    }
    if (subscribedSockets.size === 0) {
      const error = new Error('SaleWork chưa đăng ký kênh nhận kết quả thống kê trong 60 giây.');
      error.name = 'TimeoutError';
      throw error;
    }
  };
}
