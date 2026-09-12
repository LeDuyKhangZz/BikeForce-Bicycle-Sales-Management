type ClosablePage = {
  close(): Promise<void>;
};

type BrowserContextLike<TPage extends ClosablePage> = {
  pages(): TPage[];
  newPage(): Promise<TPage>;
};

/**
 * Dùng đúng một tab trong persistent context AMIS.
 *
 * Chromium có thể khôi phục tab cũ từ profile hoặc tự tạo một tab trắng khi
 * khởi động. Các script AMIS phải tái sử dụng tab đầu tiên và đóng mọi tab thừa
 * để CRM/Kế toán không đồng thời duy trì nhiều phiên đăng nhập.
 */
export async function getSingleBrowserPage<TPage extends ClosablePage>(
  context: BrowserContextLike<TPage>,
): Promise<TPage> {
  const [primaryPage, ...extraPages] = context.pages();
  await Promise.all(extraPages.map((page) => page.close()));
  return primaryPage ?? context.newPage();
}
