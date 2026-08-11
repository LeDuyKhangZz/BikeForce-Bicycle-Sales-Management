import { cn } from '@/lib/utils';

/**
 * Logo BikeForce — chiếc xe đạp tối giản của logo chính thức (DEC-046).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO LÀ SVG INLINE CHỨ KHÔNG PHẢI <img src="logo.png">
 * ─────────────────────────────────────────────────────────────────────────
 *  • Nét vẽ ăn theo `currentColor`, nên cùng một hình dùng được cả trên nền
 *    trắng (cam) lẫn trên nền đậm, không cần hai file.
 *  • Không thêm một request mạng nào trên 4G ngoài thị trường (NFR-001).
 *  • Không bao giờ vỡ nét khi phóng to — `vector-only-assets` của bộ luật
 *    ui-ux-pro-max.
 *
 *  Toạ độ được SINH RA từ cùng bộ hằng số dựng `app/icon.svg` và bốn file
 *  `public/icons/*.png`, nên logo trên web và icon màn hình chính **không thể
 *  lệch hình**. Muốn đổi hình thì đổi ở trình sinh rồi xuất lại cả bộ, đừng sửa
 *  tay `d=` ở đây.
 *
 *  ⚠ Nhưng `viewBox` thì KHÔNG được sinh ra đúng. Bốn file PNG và `app/icon.svg`
 *  đặt hình vào khung 512×512 nên chúng vô can; riêng bản inline này lấy khung
 *  KHÍT với hình, và bản đầu tiên chỉ chép được KÍCH THƯỚC mà đánh rơi ĐỘ LỆCH
 *  (`0 0 101 75` thay vì `0 13.07 101 74.86`) — đáy hai bánh bị chém mất ~17%.
 *  Xem chú thích ngay tại thuộc tính `viewBox` bên dưới (ISSUE-030).
 *
 *  ⚠ Đây là LOGO. WCAG 1.4.3/1.4.11 miễn trừ logotype khỏi ngưỡng tương phản,
 *  nên cam #E9A04F (2,19:1 trên trắng) hợp lệ **ở đây và chỉ ở đây**. Đừng lấy
 *  `text-accent` đó đi tô chữ hay icon mang nghĩa.
 */

type Props = {
  /** `true` khi logo đứng cạnh chữ "BikeForce" — lúc đó hình là trang trí. */
  decorative?: boolean;
  className?: string;
};

export function BrandMark({ decorative = false, className }: Props) {
  return (
    <svg
      // ⚠ GỐC Y LÀ 13.07, KHÔNG PHẢI 0 — đừng "làm gọn" thành `0 0 101 75`.
      //
      // Hình xe nằm trong khoảng y ∈ [13.07 · 87.93] (đã tính nửa bề rộng nét
      // 8.45/2 = 4.225 của `stroke-linecap="round"`). Bản đầu tiên viết
      // `viewBox="0 0 101 75"` — đúng KÍCH THƯỚC nhưng thiếu ĐỘ LỆCH, nên khung
      // nhìn tụt lên 13 đơn vị: đáy hai bánh bị chém phẳng mất 12,9 đơn vị
      // (~17% chiều cao) trong khi đỉnh thừa một dải trắng đúng bằng chừng ấy.
      // Lỗi này sống sót qua cả Phase 13 vì `app/icon.svg` và bốn file
      // `public/icons/*.png` được sinh ra ĐÚNG — chỉ riêng khung nhìn ở đây sai,
      // nên không bộ đo nào của dự án thấy được, chỉ MẮT NGƯỜI mới thấy
      // (ISSUE-030).
      viewBox="0 13.07 101 74.86"
      // Mốc cho luật `logo-clipped` của `e2e/ui-quality.spec.ts`: nó lấy
      // `getBBox()` của hình, nới ra nửa bề rộng nét, rồi bắt buộc kết quả nằm
      // TRỌN trong `viewBox`. Gỡ thuộc tính này là gỡ luôn hàng rào — phép đo
      // sẽ không tìm thấy gì và báo "0 vi phạm" một cách oan uổng.
      data-brand-mark=""
      // Hình luôn giữ tỉ lệ; kích thước do `className` của nơi gọi quyết định.
      className={cn('h-auto shrink-0', className)}
      // Trang trí thì phải ẩn hẳn khỏi screen reader — đọc "BikeForce" hai lần
      // (một lần từ ảnh, một lần từ chữ bên cạnh) là tiếng ồn, không phải thông tin.
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : 'BikeForce'}
    >
      {!decorative && <title>BikeForce</title>}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="8.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Hai bánh là cung HỞ — khe nằm đúng chỗ khung xe đi qua. */}
        <path d="M47.46 54.89 A22.13 22.13 0 1 1 35.52 41.42" />
        <path d="M80.43 40.2 A22.13 22.13 0 1 1 64.65 41.82" />
        {/* Khung: đường chéo dài · cọc yên · nét vẩy ở đỉnh. */}
        <path d="M26.36 61.57 L70.62 22.33" />
        <path d="M70.62 22.33 L74.64 61.57" />
        <path d="M70.62 22.33 L79.67 17.3" />
        {/* Hai chấm moay-ơ. */}
        <circle cx="26.36" cy="61.57" r="4.02" fill="currentColor" stroke="none" />
        <circle cx="74.64" cy="61.57" r="4.02" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

type LockupProps = {
  /** `sm` cho header/sidebar, `lg` cho màn hình đăng nhập. */
  size?: 'sm' | 'lg';
  /**
   * `brand` — chữ hiệu XANH, dùng trên mọi nền sáng (mặc định).
   * `inverse` — chữ hiệu TRẮNG, chỉ dùng trên nền đậm.
   *
   * PHASE 13b (DEC-054): cột thương hiệu của `/login` có nền `heading`
   * (#0B4A76). Chữ hiệu xanh #0B4A76 đặt lên đó là **1:1** — chữ biến mất hoàn
   * toàn. Đây là lỗi đã xảy ra thật và chỉ lộ ra khi CHỤP ẢNH NHÌN, không một
   * phép đo tự động nào của dự án bắt được (logotype được WCAG miễn trừ khỏi
   * ngưỡng tương phản, nên bộ đo cũng bỏ qua nó).
   *
   * ⚠ Hình xe GIỮ NGUYÊN màu cam ở cả hai tone — đó là bản sắc của logo gốc, và
   * cam #E9A04F trên #0B4A76 đo được **4,30:1**, vượt ngưỡng 3:1 của WCAG
   * 1.4.11 cho đồ hoạ.
   */
  tone?: 'brand' | 'inverse';
  className?: string;
};

/**
 * Logo đầy đủ: hình xe **cam** + chữ hiệu **xanh**, đúng thứ tự của logo gốc.
 *
 * Chữ là `<span>` thật chứ không nằm trong SVG — cùng lý do với biểu đồ trend
 * (DEC-044): chữ trong SVG bị phóng to theo viewBox và không ăn theo cỡ chữ hệ
 * thống mà người dùng đã chỉnh (`dynamic-type`).
 */
export function BrandLockup({ size = 'sm', tone = 'brand', className }: LockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark
        decorative
        className={cn('text-accent', size === 'lg' ? 'w-12' : 'w-8')}
      />
      <span
        className={cn(
          'font-bold tracking-tight',
          tone === 'inverse' ? 'text-white' : 'text-heading',
          size === 'lg' ? 'text-3xl' : 'text-base',
        )}
      >
        BikeForce
      </span>
    </span>
  );
}
