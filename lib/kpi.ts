/**
 * ─────────────────────────────────────────────────────────────────────────
 *  KHUNG CỦA PHASE 1 — CHƯA CÓ LOGIC. Triển khai đầy đủ ở PHASE 5.
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 1 chỉ chốt SIGNATURE đúng theo Master Spec §9 để các tầng trên import
 * được đúng tên ngay từ đầu. Thân hàm cố ý `throw`: thà nổ to còn hơn âm thầm
 * trả về con số sai cho một app mà toàn bộ giá trị nằm ở việc số phải đúng.
 *
 * Đây là NGUỒN DUY NHẤT của công thức KPI (NFR-012, AGENTS.md §9). Không
 * component, service, Server Action hay route ảnh nào được tự tính lại
 * `actual / target × 100`.
 *
 * Ràng buộc Phase 5 phải tuân thủ:
 *   • BR-004  — achievement được phép > 100%, KHÔNG clamp.
 *   • BR-014  — `achievement = actual / target × 100`, làm tròn 1 chữ số THẬP
 *               PHÂN CHỈ ở tầng hiển thị.
 *   • BR-011  — KHÔNG persist vào DB, luôn tính runtime (DEC-007).
 *   • BR-015  — KHÔNG BAO GIỜ để `NaN` / `Infinity` lọt ra UI (DEC-025):
 *       ┌ target > 0            → percent = actual/target×100 → '83,3%'
 *       ├ target = 0, actual = 0 → percent = 100              → '100,0%'  EXCEEDED
 *       ├ target = 0, actual > 0 → percent = null → số vượt tuyệt đối có dấu
 *       │                          cộng + đơn vị ('+3 xe', '+3.000.000 ₫'),
 *       │                          nhãn "Vượt kế hoạch", EXCEEDED
 *       └ chưa có actual        → percent = null → '—'                    PENDING
 *
 * TODO(Phase 5) — hai việc phải chốt trước khi viết thân hàm:
 *   1. DEC-025 yêu cầu `AchievementResult` mang thêm SỐ VƯỢT và ĐƠN VỊ. docs/11
 *      §DEC-025 ghi rõ "chốt cách cài đặt ở Phase 5": hoặc `calculateAchievement()`
 *      nhận thêm tham số đơn vị, hoặc trả số vượt thô để tầng hiển thị tự format.
 *      Chọn xong phải cập nhật type bên dưới VÀ docs/01 §"Hệ quả cho việc cài đặt".
 *   2. docs/01 mâu thuẫn nội bộ về `percent: null` — dòng 342 nói "CHỈ xảy ra khi
 *      target=0 && actual>0", nhưng bảng dòng 763 cho `null` cả khi chưa có
 *      actual. Xem ISSUE-008. Phải chốt trước khi viết unit test biên.
 */

/** Ngưỡng do BR-023 quy định. Giao diện KHÔNG BAO GIỜ tự quyết ngưỡng này. */
export type AchievementStatus = 'EXCEEDED' | 'NEAR' | 'MISSED' | 'PENDING';

export type AchievementResult = {
  /** `null` theo BR-015 — xem bảng ở đầu file. Không bao giờ `NaN` / `Infinity`. */
  percent: number | null;
  status: AchievementStatus;
  /** Chuỗi ĐÃ format sẵn để render thẳng: '80,0%' | '125,0%' | '—'. */
  display: string;
};

export function calculateAchievement(
  _target: number,
  _actual: number | null,
): AchievementResult {
  throw new Error('calculateAchievement() chưa được triển khai — xem PHASE 5.');
}

export function getAchievementStatus(_pct: number | null): AchievementStatus {
  throw new Error('getAchievementStatus() chưa được triển khai — xem PHASE 5.');
}
