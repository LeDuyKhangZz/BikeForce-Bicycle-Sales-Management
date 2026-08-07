-- =============================================================================
-- BikeForce 0003 — functions + triggers
-- Phase 2 — Database & Auth.
-- Nguồn thiết kế: docs/02-database-design.md §7.3, §9 · docs/06-auth-permissions.md §6.1
-- Business rule: BR-001, BR-003, BR-005, BR-008, BR-009, BR-012, BR-025
-- Decision: DEC-006 (SECURITY DEFINER + search_path cố định)
--
-- KIỂM CHỨNG CẢNH BÁO 2 của docs/02 §11 (đã chạy thật trên Supabase local,
-- Postgres 17.6.1.156):
--     select rolname, rolsuper, rolbypassrls from pg_roles ...
--     postgres      | f | t      ← CÓ bypassrls
--     service_role  | f | t
--     authenticated | f | f
--     anon          | f | f
-- Vì `postgres` (owner của các hàm dưới đây và của public.profiles) CÓ
-- `rolbypassrls`, nên `force row level security` KHÔNG làm `handle_new_user()`
-- bị chặn khi INSERT vào public.profiles, và KHÔNG làm đệ quy 42P17 quay lại
-- ở `is_admin()`. Do đó giữ nguyên phương án thiết kế gốc (enable + force),
-- không cần dùng lối thoát (A) hay (B) của docs/02 §11.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- vn_today() — ngày nghiệp vụ VN, dùng trong RLS policy (BR-005)
-- ----------------------------------------------------------------------------
create or replace function public.vn_today()
returns date
language sql
stable
set search_path = pg_catalog, public
as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

comment on function public.vn_today() is
  'BR-005. Bản DB của lib/date.ts getVietnamToday(). Hai nơi phải luôn cho cùng kết quả — có test biên ở Phase 11.';

-- ----------------------------------------------------------------------------
-- set_updated_at() — không tin updated_at do client gửi lên
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_daily_reports_set_updated_at
  before update on public.daily_reports
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- is_admin() / is_active_sales() — dùng trong policy
-- SECURITY DEFINER là bắt buộc: docs/02 §11 CẢNH BÁO 1 (DEC-006).
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
      and p.is_active
  );
$$;

create or replace function public.is_active_sales()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'SALES'
      and p.is_active
  );
$$;

-- Hàm SECURITY DEFINER không được để EXECUTE mở cho PUBLIC.
revoke execute on function public.is_admin()        from public;
revoke execute on function public.is_active_sales() from public;
grant  execute on function public.is_admin()        to authenticated;
grant  execute on function public.is_active_sales() to authenticated;
grant  execute on function public.vn_today()        to authenticated;

-- ----------------------------------------------------------------------------
-- handle_new_user() — tạo profile khi Admin tạo tài khoản (UC-17, FR-030)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_full_name     text;
  v_phone         text;
  v_employee_code text;
begin
  v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  if v_full_name is null then
    raise exception
      'handle_new_user: raw_user_meta_data.full_name là bắt buộc khi tạo tài khoản (UC-17/FR-030)'
      using errcode = '23514';
  end if;

  v_phone         := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  v_employee_code := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'employee_code', '')), '');

  -- role KHÔNG lấy từ metadata: user_metadata do client sửa được qua
  -- auth.updateUser(), lấy từ đó là mở đường tự nâng quyền.
  -- Mọi tài khoản mới đều là SALES. Admin đầu tiên được nâng quyền một lần duy
  -- nhất bằng SQL editor theo runbook ở docs/09-deployment.md.
  insert into public.profiles (id, full_name, email, phone, employee_code)
  values (new.id, v_full_name, new.email, v_phone, v_employee_code)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- guard_profile_self_update() — chặn tự nâng quyền (BR-009, BR-012, BR-025)
-- SECURITY INVOKER (mặc định): hàm không cần quyền cao hơn người gọi.
-- ----------------------------------------------------------------------------
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profiles.id là bất biến' using errcode = '42501';
  end if;

  -- Không có JWT nghĩa là service role hoặc migration đang chạy: bỏ qua.
  if (select auth.uid()) is null then
    return new;
  end if;

  if (select public.is_admin()) then
    return new;
  end if;

  if new.role      is distinct from old.role
  or new.is_active is distinct from old.is_active
  or new.email     is distinct from old.email then
    raise exception
      'Không được tự thay đổi role/is_active/email trên hồ sơ của mình'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();

-- ----------------------------------------------------------------------------
-- guard_report_transition() — BR-008
-- ----------------------------------------------------------------------------
create or replace function public.guard_report_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'daily_reports.id là bất biến' using errcode = '42501';
  end if;

  if new.sales_id is distinct from old.sales_id then
    raise exception 'Không được chuyển báo cáo sang Sales khác (BR-003)'
      using errcode = '42501';
  end if;

  if new.report_date is distinct from old.report_date then
    raise exception 'Không được đổi report_date của báo cáo đã tạo (BR-001)'
      using errcode = '42501';
  end if;

  if old.status = 'COMPLETED' and new.status = 'MORNING_SUBMITTED' then
    raise exception 'Không được quay lui COMPLETED -> MORNING_SUBMITTED (BR-008)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_daily_reports_guard_transition
  before update on public.daily_reports
  for each row execute function public.guard_report_transition();

revoke execute on function public.set_updated_at()             from public;
revoke execute on function public.handle_new_user()            from public;
revoke execute on function public.guard_profile_self_update()  from public;
revoke execute on function public.guard_report_transition()    from public;

-- GHI CHÚ CÓ CHỦ ĐÍCH (docs/02 §7.3): trigger KHÔNG tự đóng dấu
-- `evening_submitted_at` khi status chuyển sang COMPLETED. Server Action phải
-- set tường minh (FR-015), và `ck_completed_requires_actuals` đã chặn trường
-- hợp quên. Giữ trigger chỉ làm đúng việc "cấm" để không có hai nơi cùng ghi
-- một cột.
