/**
 * Nối class có điều kiện.
 *
 * Cố ý KHÔNG dùng `clsx` + `tailwind-merge`: Master Spec §2 yêu cầu không
 * over-engineer, và danh sách dependency của Phase 1 đã chốt (SESSION_CHECKPOINT
 * § Next Exact Steps). Nếu về sau xung đột class trở thành vấn đề thật thì
 * thêm `tailwind-merge` bằng một DEC mới, không thêm lén.
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
