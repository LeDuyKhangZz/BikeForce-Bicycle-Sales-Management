import { describe, expect, it, vi } from 'vitest';

import { getSingleBrowserPage } from '@/lib/amis/single-browser-page';

function page() {
  return { close: vi.fn(async () => undefined) };
}

describe('getSingleBrowserPage', () => {
  it('tái sử dụng tab duy nhất thay vì mở tab mới', async () => {
    const existingPage = page();
    const newPage = vi.fn(async () => page());

    const result = await getSingleBrowserPage({ pages: () => [existingPage], newPage });

    expect(result).toBe(existingPage);
    expect(newPage).not.toHaveBeenCalled();
  });

  it('giữ tab đầu tiên và đóng mọi tab thừa được khôi phục từ profile', async () => {
    const primaryPage = page();
    const extraPageA = page();
    const extraPageB = page();

    const result = await getSingleBrowserPage({
      pages: () => [primaryPage, extraPageA, extraPageB],
      newPage: vi.fn(async () => page()),
    });

    expect(result).toBe(primaryPage);
    expect(primaryPage.close).not.toHaveBeenCalled();
    expect(extraPageA.close).toHaveBeenCalledOnce();
    expect(extraPageB.close).toHaveBeenCalledOnce();
  });

  it('chỉ tạo một tab khi context chưa có tab nào', async () => {
    const createdPage = page();
    const newPage = vi.fn(async () => createdPage);

    const result = await getSingleBrowserPage({ pages: () => [], newPage });

    expect(result).toBe(createdPage);
    expect(newPage).toHaveBeenCalledOnce();
  });
});
