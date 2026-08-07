/**
 * Kết quả trả về của MỌI Server Action (AGENTS.md §2).
 *
 * Là discriminated union để client phân nhánh bằng `if (!result.ok)` — không
 * phải object mơ hồ, và **không throw xuyên biên giới Server Action** để báo
 * lỗi nghiệp vụ.
 *
 * `message` luôn là chuỗi AN TOÀN đã dịch sang tiếng Việt. Chi tiết kỹ thuật
 * (mã lỗi Postgres, tên constraint, stack) chỉ được `console.error` ở server,
 * không bao giờ lọt xuống client — NFR-014.
 */
export type ActionErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'ACCOUNT_DISABLED'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ActionErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
