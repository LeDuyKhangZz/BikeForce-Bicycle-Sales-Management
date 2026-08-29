import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ⚠ TẮT bộ sinh `AGENTS.md` của Next 16 — PHASE 13b.
   *
   * `next dev` tự chèn một khối `<!-- BEGIN:nextjs-agent-rules -->` vào cuối
   * `AGENTS.md` mỗi lần khởi động. `AGENTS.md` của dự án này là **tài liệu điều
   * khiển** (CLAUDE.md §7a), không phải file sinh ra được: để Next ghi vào đó
   * nghĩa là cứ chạy `npm run dev` là working tree bẩn thêm một lần, và tài liệu
   * dần mang nội dung không ai duyệt.
   *
   * Nội dung Next muốn thêm không mất đi — nó nằm ở
   * `node_modules/next/dist/docs/` và đọc trực tiếp được khi cần.
   */
  agentRules: false,

  /**
   * ⚠ Bắt buộc cho các route dùng package native (.node binary) như
   * `@napi-rs/canvas` (dùng trong `/api/salework/report-image` để vẽ ảnh báo
   * cáo cho n8n).
   *
   * Mặc định Next.js cố gắng bundle mọi thứ mà API route import vào, kể cả
   * package native. Bundler (webpack/turbopack) không xử lý đúng cơ chế
   * `require()` động mà các package native dùng để tự chọn đúng file `.node`
   * theo hệ điều hành (vd `skia.win32-x64-msvc.node` trên Windows) — kết quả
   * là dù file `.node` tồn tại thật trong `node_modules`, lúc chạy vẫn báo
   * "Cannot find module" / "could not resolve ... into a module".
   *
   * Khai báo package ở đây để Next.js loại nó khỏi bundle và để Node.js
   * `require()` trực tiếp lúc runtime — đúng cơ chế mà `@napi-rs/canvas`
   * cần để tự dò binary theo nền tảng.
   */
  serverExternalPackages: ['@napi-rs/canvas'],

  /**
   * Route ảnh 9:16 đọc ba file font bằng `fs` ở Node runtime (DEC-010,
   * ISSUE-002). Đường dẫn được ghép runtime bằng `join(process.cwd(), …)` nên
   * bộ dò phụ thuộc của Vercel KHÔNG nhìn thấy nó — thiếu khai báo này thì
   * `next build` vẫn xanh, còn hàm trên Vercel ném `ENOENT` ngay request đầu.
   *
   * Khai báo tường minh thay vì `import` file font: `import` một `.ttf` sẽ đẩy
   * ~1MB vào bundle của route dù request có gọi tới hay không.
   */
  outputFileTracingIncludes: {
    // ⚠ `public/images/**` thêm ở PHASE 18 (DEC-069) cho **dải lửa** của thanh
    // tiến độ — cùng lý do với font: nó cũng được đọc bằng `fs` lúc render, nên
    // thiếu dòng này thì ảnh vẫn build xanh mà hàm trên Vercel ném `ENOENT`.
    '/api/reports/[id]/share-image': ['./public/fonts/**', './public/images/**'],
  },
};

export default nextConfig;