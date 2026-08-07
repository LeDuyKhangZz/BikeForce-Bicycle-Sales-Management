/**
 * Zod schema cho báo cáo ngày.
 *
 * MỘT nguồn duy nhất, dùng chung cho form phía client và Server Action phía
 * server (AGENTS.md §9). Server **luôn** validate lại, không tin client
 * (NFR-006).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  BA ĐIỀU SCHEMA NÀY CỐ Ý KHÔNG CÓ — AGENTS.md §8, docs/07 §1.1
 * ─────────────────────────────────────────────────────────────────────────
 *  • `sales_id`  — luôn lấy từ `auth.uid()` phía server (QUY TẮC 2).
 *  • `report_date` — luôn lấy từ `getVietnamToday()` phía server (QUY TẮC 3).
 *  • `status`    — luôn do server đặt theo BR-008.
 *
 *  Nếu payload của client có ba khoá này thì Zod **strip** chúng đi (hành vi
 *  mặc định của `z.object`), nên không có đường nào để một payload bị sửa tay
 *  ghi vào báo cáo của người khác hoặc cho một ngày khác.
 *
 * Tên khoá dùng **snake_case khớp đúng tên cột** của `public.daily_reports`.
 * Nhờ vậy output của `safeParse` gắn thẳng vào `TablesInsert<'daily_reports'>`
 * mà không cần một tầng ánh xạ trung gian — tầng đó là nơi rất dễ gõ nhầm một
 * cột mà TypeScript không bắt được. `docs/08 §3.6` cũng khẳng định issue path
 * là `['target_sales_quantity']`.
 */
import { z } from 'zod';

import { parseCurrencyInput } from '@/lib/currency';
import { getVietnamToday, isValidVietnamDate } from '@/lib/date';

/* ---------------------------------------------------------------------------
 * Hằng số miền giá trị — khớp ĐÚNG các CHECK constraint của
 * `supabase/migrations/0002_daily_reports.sql`. Lệch một con số ở đây nghĩa là
 * người dùng sẽ gặp lỗi `23514` thô từ Postgres thay vì một thông báo tử tế
 * (docs/07 §6.1 — đó bị coi là bug của tầng validation).
 * ------------------------------------------------------------------------- */

/** BR-017 — trần doanh thu 100 tỷ VND, biên INCLUSIVE. */
export const MAX_REVENUE_VND = 100_000_000_000;
/** BR-006 — `ck_target_sales_quantity`. */
export const MAX_SALES_QUANTITY = 10_000;
/** BR-006, DEC-029 — `ck_target_visit_points`. */
export const MAX_VISIT_POINTS = 1_000;
/** BR-006 — `ck_target_customer_visits`. */
export const MAX_CUSTOMER_VISITS = 1_000;
/** `ck_planned_route_len` — đo sau `btrim`. */
export const MAX_ROUTE_LENGTH = 300;
/** `ck_visit_purpose_len`. */
export const MAX_VISIT_PURPOSE_LENGTH = 300;
/** BR-018 — `ck_evening_note_len`. Đo theo KÝ TỰ (`char_length`), không theo byte. */
export const MAX_EVENING_NOTE_LENGTH = 1_000;

/**
 * Chuẩn hoá đầu vào số TRƯỚC khi Zod kiểm kiểu.
 *
 * Form gửi lên `FormData` nên mọi giá trị đều là **chuỗi**; còn test và lời gọi
 * nội bộ truyền thẳng **số**. Hàm này gánh cả hai mà không cần hai schema.
 *
 * Dùng lại `parseCurrencyInput` thay vì viết một parser thứ hai (AGENTS.md §9 —
 * không nhân bản logic): hợp đồng của nó đúng bằng thứ cần ở đây — "chuỗi người
 * dùng gõ → số nguyên không âm, hoặc `null` nếu rác". Chuỗi rác được trả về
 * NGUYÊN VẸN để Zod báo đúng thông điệp tiếng Việt thay vì `null`.
 */
function coerceInteger(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed === '') return undefined; // để `required_error` lên tiếng

  return parseCurrencyInput(trimmed) ?? value;
}

/** Một ô số nguyên bắt buộc, 0..max. */
function integerField(max: number, label: string) {
  return z.preprocess(
    coerceInteger,
    z
      .number({ message: `Vui lòng nhập ${label} bằng số.` })
      .int({ message: `${label} phải là số nguyên.` })
      .min(0, { message: `${label} không được là số âm.` })
      .max(max, { message: `${label} tối đa ${max.toLocaleString('vi-VN')}.` }),
  );
}

/**
 * Một ô văn bản TUỲ CHỌN, tối đa `max` ký tự.
 *
 * Ô trống trên form gửi lên chuỗi rỗng; quy về `null` để ghi xuống cột nullable
 * chứ không ghi chuỗi rỗng — `''` và `null` là hai thứ khác nhau khi hiển thị
 * lại, và cột `text` nullable của `docs/02` cố ý dùng `null` cho "không có".
 *
 * Độ dài đo SAU `trim`, khớp cách `ck_*_len` đếm bằng `char_length` (ký tự
 * Unicode, không phải byte) — nhờ vậy 300 ký tự tiếng Việt có dấu vẫn hợp lệ.
 */
function optionalTextField(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, { message: `${label} tối đa ${max.toLocaleString('vi-VN')} ký tự.` })
    .nullish()
    .transform((value) => (value == null || value === '' ? null : value));
}

/**
 * `z.number()` của Zod từ chối `NaN` và `Infinity` sẵn, nhưng đó là hành vi
 * ngầm định — `docs/08 §3.6` yêu cầu case tường minh, và test khoá nó lại.
 */
export const morningReportSchema = z.object({
  planned_route: z
    .string({ message: 'Vui lòng nhập tuyến ghé thăm.' })
    .trim()
    .min(1, { message: 'Vui lòng nhập tuyến ghé thăm.' })
    .max(MAX_ROUTE_LENGTH, {
      message: `Tuyến ghé thăm tối đa ${MAX_ROUTE_LENGTH} ký tự.`,
    }),

  // Optional (DEC-029, OQ-01).
  visit_purpose: optionalTextField(MAX_VISIT_PURPOSE_LENGTH, 'Mục đích chuyến đi'),

  target_visit_points: integerField(MAX_VISIT_POINTS, 'Mục tiêu điểm viếng thăm'),
  target_sales_quantity: integerField(MAX_SALES_QUANTITY, 'Mục tiêu doanh số'),
  target_revenue: integerField(MAX_REVENUE_VND, 'Mục tiêu doanh thu'),
  target_customer_visits: integerField(MAX_CUSTOMER_VISITS, 'Mục tiêu số lượng khách hàng'),
});

export type MorningReportInput = z.infer<typeof morningReportSchema>;

/**
 * Thực đạt cuối ngày — UC-06, FR-014, BR-018.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO CẢ BỐN CHỈ SỐ `actual_*` ĐỀU BẮT BUỘC
 * ─────────────────────────────────────────────────────────────────────────
 *  `ck_completed_requires_actuals` (0002) đòi cả bốn cột `actual_*` **và**
 *  `evening_submitted_at` khác `null` thì `status` mới được là `'COMPLETED'`.
 *  Cho phép bỏ trống một ô ở tầng này nghĩa là người dùng gõ xong cả form rồi
 *  mới nhận một lỗi `23514` thô từ Postgres — `docs/07 §6.1` coi đó là bug của
 *  tầng validation, không phải "database đã chặn rồi nên thôi".
 *
 *  Biên số học dùng lại đúng các hằng `MAX_*` phía trên: CHECK của cột `actual_*`
 *  và cột `target_*` cùng một dải giá trị (0002), nên không có hằng số thứ hai
 *  để lệch nhau.
 *
 *  Hai ô tuỳ chọn: `actual_route` (DEC-029, OQ-02 — tuyến đi thật, đối chiếu với
 *  `planned_route`) và `evening_note` ≤ 1000 ký tự (BR-018).
 *
 *  Giống `morningReportSchema`, schema này **không có** `report_id`, `sales_id`,
 *  `status`, `evening_submitted_at`: `report_id` được validate riêng bằng
 *  `z.uuid()` trong Server Action, ba khoá còn lại do server đặt (QUY TẮC 2, 3).
 */
export const eveningReportSchema = z.object({
  actual_route: optionalTextField(MAX_ROUTE_LENGTH, 'Tuyến thực tế'),

  actual_visit_points: integerField(MAX_VISIT_POINTS, 'Số điểm đã viếng thăm'),
  actual_sales_quantity: integerField(MAX_SALES_QUANTITY, 'Doanh số thực đạt'),
  actual_revenue: integerField(MAX_REVENUE_VND, 'Doanh thu thực đạt'),
  actual_customer_visits: integerField(MAX_CUSTOMER_VISITS, 'Số khách hàng đã gặp'),

  evening_note: optionalTextField(MAX_EVENING_NOTE_LENGTH, 'Ghi chú cuối ngày'),
});

export type EveningReportInput = z.infer<typeof eveningReportSchema>;

/**
 * Ngày nghiệp vụ hợp lệ để GHI báo cáo.
 *
 * ⚠ Schema này **không** dùng để nhận ngày từ client — nó kiểm lại chính giá trị
 * mà server vừa tính bằng `getVietnamToday()`. Nghe thừa, nhưng nó là chốt chặn
 * cuối cùng phía ứng dụng cho BR-016 (không báo cáo ngày tương lai) và BR-021
 * (không nhập bù ngày cũ), và nó cho phép kiểm hai rule đó bằng unit test thay
 * vì phải dựng cả một database (docs/08 §3.6).
 *
 * Ba lớp còn lại vẫn nguyên: RLS `reports_insert_own_today` yêu cầu
 * `report_date = vn_today()`, và CHECK `ck_report_not_future` chặn ngày tương lai
 * kể cả với role có `BYPASSRLS`.
 */
export const reportDateSchema = z
  .string({ message: 'Ngày báo cáo không hợp lệ.' })
  .refine(isValidVietnamDate, { message: 'Ngày báo cáo không hợp lệ.' })
  .refine((value) => value === getVietnamToday(), {
    message: 'Chỉ được tạo báo cáo cho ngày hôm nay.',
  });
