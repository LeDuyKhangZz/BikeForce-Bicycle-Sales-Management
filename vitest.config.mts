import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Ba project theo `docs/08-testing-strategy.md §2.1`:
 *
 *   unit         — không I/O, không mạng, không DB. Chạy ở mọi push.
 *   integration  — Postgres local trong Docker, kết nối bằng SERVICE ROLE để
 *                  dựng/dọn fixture. Kiểm CHECK / UNIQUE / trigger / function.
 *   rls          — cùng database, nhưng kết nối bằng ANON KEY + JWT THẬT của
 *                  từng user. Đây là tầng DUY NHẤT chứng minh được RLS đúng;
 *                  test qua UI không chứng minh gì (AGENTS.md §11).
 *
 * `integration` và `rls` ĐỀU CẦN `npx supabase start` đang chạy. Không có cơ
 * chế tự bỏ qua khi database offline — bỏ qua im lặng sẽ khiến bộ test "xanh"
 * mà thực chất chưa kiểm gì, đúng thứ Master Spec §42 cấm.
 */

const rootDir = fileURLToPath(new URL('.', import.meta.url));

/**
 * Nạp env theo thứ tự `.env` → `.env.local` → `.env.test` → `.env.test.local`,
 * file sau đè file trước. Phải gọi tường minh vì Vitest **không** tự nạp
 * `.env.local` ở mode `test`.
 *
 * Thứ tự này là thứ giữ cho bộ test an toàn: `.env.local` trỏ vào Supabase
 * CLOUD (môi trường chạy `npm run dev` / `npm run build`), còn `.env.test.local`
 * trỏ vào Supabase LOCAL và **đè lên** nó. Nhờ vậy `npm test` không bao giờ
 * chạm production, kể cả khi ai đó quên (DEC-022).
 *
 * `tests/integration/setup.ts` vẫn có chặn an toàn riêng — hai lớp, không phải
 * một, vì bộ test này XOÁ dữ liệu.
 */
const env = loadEnv('test', rootDir, '');

const alias = { '@': rootDir.replace(/\/$/, '') };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'lib/**/*.test.ts',
            'lib/**/*.test.tsx',
            'components/**/*.test.ts',
            'components/**/*.test.tsx',
          ],
          env,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          // Cùng chạm một database ⇒ chạy tuần tự, không song song theo file.
          fileParallelism: false,
          hookTimeout: 30_000,
          testTimeout: 30_000,
          env,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
          fileParallelism: false,
          hookTimeout: 30_000,
          testTimeout: 30_000,
          env,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // docs/08 §2.3
      exclude: [
        'types/database.types.ts',
        '**/*.config.*',
        'supabase/**',
        'e2e/**',
        'tests/**',
        '.next/**',
      ],
    },
  },
});
