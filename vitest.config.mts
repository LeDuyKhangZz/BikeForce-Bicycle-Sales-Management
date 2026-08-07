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

// `loadEnv` đọc .env, .env.local, .env.test, .env.test.local. Cần gọi tường
// minh vì Vitest KHÔNG tự nạp `.env.local` ở mode `test`.
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
          include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
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
