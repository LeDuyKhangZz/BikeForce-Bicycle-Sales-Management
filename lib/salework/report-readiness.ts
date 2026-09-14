import type { Page } from '@playwright/test';

export async function waitForSaleWorkIdle(page: Pick<Page, 'locator'>): Promise<void> {
  await page.locator('.el-loading-mask:visible').first().waitFor({
    state: 'hidden',
    timeout: 60_000,
  });
}

/** Chỉ thử lại bước mở bộ lọc, trước khi chọn tài khoản hoặc ghi dữ liệu. */
export async function openSaleWorkFilters(
  page: Pick<Page, 'reload'>,
  prepare: () => Promise<void>,
  onRetry: () => void,
): Promise<void> {
  try {
    await prepare();
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'TimeoutError') throw error;
    onRetry();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    try {
      await prepare();
    } catch (retryError) {
      if (!(retryError instanceof Error) || retryError.name !== 'TimeoutError') throw retryError;
      throw new Error('SaleWork vẫn bị kẹt khi tải bộ lọc sau khi tải lại; chưa ghi dữ liệu SaleWork.');
    }
  }
}
