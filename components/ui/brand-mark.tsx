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
      viewBox="0 0 101 75"
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
  className?: string;
};

/**
 * Logo đầy đủ: hình xe **cam** + chữ hiệu **xanh**, đúng thứ tự của logo gốc.
 *
 * Chữ là `<span>` thật chứ không nằm trong SVG — cùng lý do với biểu đồ trend
 * (DEC-044): chữ trong SVG bị phóng to theo viewBox và không ăn theo cỡ chữ hệ
 * thống mà người dùng đã chỉnh (`dynamic-type`).
 */
export function BrandLockup({ size = 'sm', className }: LockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark
        decorative
        className={cn('text-accent', size === 'lg' ? 'w-12' : 'w-8')}
      />
      <span
        className={cn(
          'font-bold tracking-tight text-heading',
          size === 'lg' ? 'text-3xl' : 'text-base',
        )}
      >
        BikeForce
      </span>
    </span>
  );
}
