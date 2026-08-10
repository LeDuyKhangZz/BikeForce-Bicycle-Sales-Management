import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Nạp cấu hình cho bộ E2E — LUÔN trỏ vào Supabase LOCAL (DEC-022).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO PHẢI TỰ ĐỌC FILE THAY VÌ ĐỂ NEXT TỰ NẠP
 * ─────────────────────────────────────────────────────────────────────────
 *  `next build` / `next start` chạy ở `NODE_ENV=production`, nên Next nạp
 *  `.env.local` — file đó trỏ sang **cloud**. Bộ E2E thì ghi và xoá dữ liệu:
 *  tạo tài khoản, tạo báo cáo, hoàn tất báo cáo. Chạy nó trên cloud là hỏng dữ
 *  liệu thật.
 *
 *  Vitest tránh được bẫy này nhờ `loadEnv('test', …)` nạp `.env.test.local` đè
 *  lên `.env.local` (xem `vitest.config.mts`). Playwright không có cơ chế đó,
 *  nên bộ E2E tự đọc **đúng cùng một file** rồi bơm vào `webServer.env` —
 *  giá trị truyền theo tiến trình sẽ thắng mọi thứ Next tự nạp.
 *
 *  Và giống `tests/integration/setup.ts`, ở đây có **chặn an toàn thứ hai**:
 *  URL không phải localhost thì ném lỗi ngay, không chạy tiếp.
 *
 *  Cố ý KHÔNG thêm `dotenv`: bộ phân tích 15 dòng dưới đây đủ cho định dạng
 *  `KEY=value` mà dự án đang dùng, và AGENTS.md không khuyến khích thêm
 *  dependency cho việc một hàm giải quyết được.
 */

/**
 * Thư mục gốc dự án.
 *
 * Dùng `process.cwd()` chứ **không** `import.meta.url`: Playwright biên dịch
 * file cấu hình và mọi thứ nó import sang CommonJS, nơi `import.meta` là lỗi cú
 * pháp. `npx playwright test` luôn chạy từ thư mục chứa `playwright.config.ts`,
 * nên `cwd` là mốc đúng và ổn định.
 */
const rootDir = process.cwd();

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

function parseEnvFile(path: string): Record<string, string> {
  let raw: string;

  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return {};
  }

  const values: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    // Bỏ nháy bao ngoài nếu có — một số máy quen viết `KEY="value"`.
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');

    if (key !== '') values[key] = value;
  }

  return values;
}

const LOCAL_HOST = /^(https?|postgresql):\/\/(?:[^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?/;

/**
 * Bốn biến bộ E2E cần, đã kiểm chứng là trỏ vào local.
 *
 * `.env.test.local` là nguồn chính; `.env.local` chỉ dùng để lấp khoá còn thiếu
 * (ví dụ máy chưa tách hai file). Chặn an toàn chạy trên **giá trị cuối cùng**
 * nên không có đường nào lọt ra cloud.
 */
export function loadE2eEnv(): Record<RequiredKey, string> {
  const merged = {
    ...parseEnvFile(join(rootDir, '.env.local')),
    ...parseEnvFile(join(rootDir, '.env.test.local')),
  };

  const result = {} as Record<RequiredKey, string>;

  for (const key of REQUIRED_KEYS) {
    const value = merged[key];

    if (value === undefined || value === '') {
      throw new Error(
        `Thiếu ${key} cho bộ E2E. Chạy \`npx supabase start\` rồi điền vào .env.test.local.`,
      );
    }

    result[key] = value;
  }

  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_DB_URL'] as const) {
    if (!LOCAL_HOST.test(result[key])) {
      throw new Error(
        `CHẶN AN TOÀN: E2E chỉ được chạy trên Supabase local, nhưng ${key} đang trỏ ra ngoài (DEC-022).`,
      );
    }
  }

  return result;
}

/** Cổng riêng của bộ E2E — không đụng `npm run dev` (3000) của người đang code. */
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

/** Mật khẩu dùng chung cho mọi tài khoản E2E. Chỉ tồn tại ở database local. */
export const E2E_PASSWORD = 'LocalDev#2026';
