/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PLACEHOLDER CỦA PHASE 1 — CHƯA PHẢI FILE GENERATE THẬT
 * ─────────────────────────────────────────────────────────────────────────
 * Schema thật CHƯA tồn tại: chưa có Supabase project, chưa có migration nào
 * được viết hay chạy (xem SESSION_CHECKPOINT.md § Database State).
 *
 * File này chỉ tồn tại để 3 Supabase client trong `lib/supabase/` typecheck
 * được ở Phase 1. Nó KHÔNG mô tả schema thật và KHÔNG được dùng làm nguồn
 * tham chiếu cho bất kỳ truy vấn nào.
 *
 * PHASE 2 sẽ GHI ĐÈ TOÀN BỘ file này bằng:
 *     supabase gen types typescript --linked > types/database.types.ts
 *
 * Từ thời điểm đó trở đi đây là file GENERATE — không sửa tay, và phải
 * regenerate + commit mỗi lần đổi schema (AGENTS.md §13).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
