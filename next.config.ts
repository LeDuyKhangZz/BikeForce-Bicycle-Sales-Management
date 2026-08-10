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
   * Route ảnh 9:16 đọc ba file font bằng `fs` ở Node runtime (DEC-010,
   * ISSUE-002). Đường dẫn được ghép runtime bằng `join(process.cwd(), …)` nên
   * bộ dò phụ thuộc của Vercel KHÔNG nhìn thấy nó — thiếu khai báo này thì
   * `next build` vẫn xanh, còn hàm trên Vercel ném `ENOENT` ngay request đầu.
   *
   * Khai báo tường minh thay vì `import` file font: `import` một `.ttf` sẽ đẩy
   * ~1MB vào bundle của route dù request có gọi tới hay không.
   */
  outputFileTracingIncludes: {
    '/api/reports/[id]/share-image': ['./public/fonts/**'],
  },
};

export default nextConfig;
