import type { MetadataRoute } from 'next';

import { buildManifest } from '@/lib/pwa/manifest';

/**
 * File quy ước metadata của Next — được phục vụ tại `/manifest.webmanifest`, và
 * Next tự chèn `<link rel="manifest">` vào mọi trang. FR-036, DEC-024.
 *
 * ⚠ ĐÂY KHÔNG PHẢI ROUTE HANDLER THỨ BA. DEC-042 chốt rằng v1 chỉ có hai Route
 * Handler (`/api/reports/[id]/share-image` và `/api/admin/reports/export`) —
 * cả hai đều nhận request có phiên và trả **dữ liệu nghiệp vụ**. File này là
 * metadata tĩnh, không chạm database, không chạm phiên, và bắt buộc phải đọc
 * được khi CHƯA đăng nhập (xem `PUBLIC_FILE` trong `middleware.ts`).
 *
 * Nội dung nằm ở `lib/pwa/manifest.ts` để unit test khoá được các ràng buộc của
 * FR-036 — `app/` không chứa logic (AGENTS.md §1.3).
 */
export default function manifest(): MetadataRoute.Manifest {
  return buildManifest();
}
