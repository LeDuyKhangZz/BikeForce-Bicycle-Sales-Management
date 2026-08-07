-- =============================================================================
-- BikeForce 0001 — extension + enums + public.profiles
-- Phase 2 — Database & Auth.
-- Nguồn thiết kế: docs/02-database-design.md §5, §7.1 · docs/06-auth-permissions.md §2
-- Business rule: BR-009, BR-012, BR-025
--
-- GHI CHÚ VỀ THỨ TỰ FILE (AGENTS.md §7):
--   File này BẬT `enable row level security` + `force row level security` ngay
--   trong cùng migration tạo bảng, nên KHÔNG có thời điểm nào bảng tồn tại mà
--   không có RLS. Các POLICY tường minh nằm ở `0004_rls_policies.sql` vì chúng
--   phụ thuộc `public.is_admin()` / `public.is_active_sales()` / `public.vn_today()`
--   — những hàm chỉ tồn tại từ `0003`. Trạng thái trung gian giữa 0001 và 0004 là
--   **deny-all** (RLS bật, chưa có policy nào), tức là trạng thái an toàn nhất,
--   không phải trạng thái hở.
-- =============================================================================

-- citext để email không phân biệt hoa/thường (BR-025).
-- Cài vào schema `extensions` theo khuyến nghị của Supabase; kiểu cột vì vậy
-- phải khai tường minh là `extensions.citext`.
create extension if not exists citext with schema extensions;

create type public.user_role     as enum ('ADMIN', 'SALES');
create type public.report_status as enum ('MORNING_SUBMITTED', 'COMPLETED');

create table public.profiles (
  id            uuid        primary key
                            references auth.users (id) on delete cascade,
  full_name     text        not null,
  email         extensions.citext not null,
  phone         text,
  employee_code text,
  role          public.user_role not null default 'SALES',
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint uq_profiles_email
    unique (email),
  constraint ck_profiles_full_name_len
    check (char_length(btrim(full_name)) between 1 and 100),
  constraint ck_profiles_phone_format
    check (phone is null or phone ~ '^[0-9+ ]{8,15}$')
);

-- UNIQUE khi khác null. Partial unique index thay vì UNIQUE constraint để ý định
-- "nhiều dòng null là hợp lệ" được viết ra tường minh, không phụ thuộc người đọc
-- có nhớ quy tắc NULL-distinct của Postgres hay không.
-- Đặt ở 0001 (không phải 0005) vì đây là ràng buộc toàn vẹn, không phải index hiệu năng.
create unique index uq_profiles_employee_code
  on public.profiles (employee_code)
  where employee_code is not null;

comment on table  public.profiles              is 'Hồ sơ người dùng, 1-1 với auth.users. Không có self-registration (BR-012).';
comment on column public.profiles.is_active    is 'BR-009. false = không đăng nhập/thao tác được. Đây là cơ chế nghỉ việc thay cho xoá tài khoản.';
comment on column public.profiles.email        is 'BR-025. Mirror của auth.users.email.';

-- Deny-by-default ở tầng GRANT, độc lập với RLS.
-- Supabase mặc định cấp quyền rộng cho anon/authenticated trên schema public,
-- nên phải thu hồi tường minh.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant  select, update on table public.profiles to authenticated;
-- Cố ý KHÔNG cấp INSERT (chỉ trigger handle_new_user tạo profile)
-- và KHÔNG cấp DELETE (BR-013).
--
-- Cố ý KHÔNG cấp bất kỳ quyền DML nào cho `service_role` (DEC-031).
-- `service_role` có `rolbypassrls = true`, nhưng **BYPASSRLS không vượt qua
-- GRANT**. Không cấp DML nghĩa là DEC-005 ("service role chỉ dùng cho
-- auth.admin.*") được chính DATABASE ép, thay vì chỉ là kỷ luật code.
-- UC-17/18/19 không bị ảnh hưởng: `auth.admin.*` đi qua GoTrue (schema `auth`),
-- còn hồ sơ thì Admin sửa bằng client `authenticated` dưới policy
-- `profiles_update_admin`.

-- RLS bật ngay tại đây (xem GHI CHÚ VỀ THỨ TỰ FILE ở đầu file).
-- Deny-by-default: chưa có policy nào ⇒ authenticated không đọc/ghi được gì.
alter table public.profiles enable row level security;
alter table public.profiles force  row level security;
