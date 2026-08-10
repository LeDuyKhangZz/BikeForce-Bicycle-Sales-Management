/**
 * Web App Manifest của BikeForce — FR-036, DEC-024, `docs/05 §15`.
 *
 * VÌ SAO NỘI DUNG NẰM Ở `lib/` CHỨ KHÔNG VIẾT THẲNG TRONG `app/manifest.ts`:
 * `app/` không chứa logic (AGENTS.md §1.3), và project `unit` của Vitest chỉ
 * quét `lib/**` (`vitest.config.mts`). Đặt ở đây thì các ràng buộc của FR-036
 * (`display: 'standalone'`, đủ 192/512, có bản `maskable`) được **khoá bằng
 * unit test** thay vì chỉ tồn tại trong một file cấu hình không ai kiểm.
 *
 * PHẠM VI CỦA v1 — DEC-024: chỉ manifest + icon + `display: 'standalone'` để
 * Sales "Thêm vào màn hình chính". **Không** service worker, **không** offline
 * sync. Đừng thêm `serviceworker` hay bất kỳ trường nào ngụ ý chạy offline vào
 * đây mà không có DEC mới — điều kiện kích hoạt cho v2 đã ghi ở
 * `docs/10-future-roadmap.md § PWA offline draft sync`.
 */
import type { MetadataRoute } from 'next';

/** Tiêu đề tab trình duyệt **và** `short_name` trên màn hình chính. */
export const APP_SHORT_NAME = 'BikeForce';

/** Tên đầy đủ — hiện trong hộp thoại cài đặt của Chrome/Edge. */
export const APP_NAME = 'BikeForce — Báo cáo bán hàng theo ngày';

export const APP_DESCRIPTION = 'Báo cáo hiệu suất bán hàng theo ngày cho đội Sales xe đạp.';

/**
 * Màu thanh trạng thái khi app chạy ở chế độ standalone, **và** màu nền màn hình
 * chờ khi mở app từ màn hình chính.
 *
 * Cả hai đều là TRẮNG chứ không phải xanh thương hiệu — đó là chủ ý của DEC-046
 * ("trắng làm chủ đạo"):
 *   • thanh trạng thái trắng nối liền với header của app (`--color-card` cũng
 *     trắng), nên không có vệt màu lạ cắt ngang đỉnh màn hình;
 *   • màn hình chờ trắng trùng với nền của `public/icons/icon-512.png`, nên icon
 *     không hiện ra như một ô vuông dán lên nền khác màu.
 * Android tự chọn icon thanh trạng thái sáng/tối theo độ sáng của `theme_color`,
 * nên nền trắng vẫn cho icon hệ thống màu tối, đọc được.
 */
export const THEME_COLOR = '#ffffff';
export const BACKGROUND_COLOR = '#ffffff';

/**
 * Bộ icon sinh sẵn ở `public/icons/` (asset commit vào repo, giống ba file font
 * của thẻ ảnh 9:16 — `docs/09 §7.1`).
 *
 * Vì sao tách `any` và `maskable` thành hai file thay vì khai một file
 * `"any maskable"`: bản `maskable` phải để nội dung nằm gọn trong vòng tròn an
 * toàn 80% của canvas, nên nét vẽ nhỏ hơn hẳn. Dùng chung một file thì hoặc là
 * icon bị Android cắt mất bánh xe, hoặc là icon trên trình duyệt bị thừa lề.
 */
export const PWA_ICONS: MetadataRoute.Manifest['icons'] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  {
    src: '/icons/icon-maskable-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable',
  },
  {
    src: '/icons/icon-maskable-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
];

/**
 * `start_url` và `scope` đều là `/`: `app/page.tsx` tự phân luồng theo role
 * (FR-004), nên mở app từ màn hình chính sẽ vào đúng dashboard của từng vai mà
 * manifest không cần biết vai đó là gì.
 *
 * KHÔNG khai `orientation`: v1 không có bố cục riêng cho landscape, và khoá
 * hướng màn hình là một ràng buộc nghiệp vụ chưa tài liệu nào yêu cầu.
 */
export function buildManifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    lang: 'vi',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    categories: ['business', 'productivity'],
    icons: PWA_ICONS,
  };
}
