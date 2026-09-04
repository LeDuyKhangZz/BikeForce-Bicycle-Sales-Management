import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // BikeForce: artifact test + coverage, không lint.
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    // Hồ sơ Chrome cục bộ của luồng SaleWork chứa extension/cache sinh tự động.
    ".salework-browser-profile*/**",
    // File generate bằng `supabase gen types typescript` — không sửa tay, không lint.
    "types/database.types.ts",
    // Artifact runtime do `supabase start` sinh ra (bundle edge function đã
    // minify). Không phải mã nguồn của dự án; đã nằm trong supabase/.gitignore.
    "supabase/.temp/**",
    "supabase/.branches/**",
  ]),
  {
    rules: {
      // NFR-012 + AGENTS.md §2: `any` bị CẤM, không phải cảnh báo.
      // Không biết kiểu thì dùng `unknown` rồi thu hẹp bằng type guard hoặc Zod.
      "@typescript-eslint/no-explicit-any": "error",

      // Nâng từ `warn` lên `error` để biến thừa không tích tụ im lặng, đồng thời
      // công nhận quy ước `_` cho tham số CỐ Ý không dùng — các khung hàm ở
      // `lib/kpi.ts`, `lib/currency.ts`, `lib/date.ts` phải giữ đúng signature
      // của Master Spec §9 dù thân hàm chưa triển khai tới Phase 5.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
