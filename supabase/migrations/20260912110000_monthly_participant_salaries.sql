-- Lương nhân viên báo cáo tháng chưa có profile Sales. Không tạo auth user giả.
create table public.monthly_participant_salaries (
  period_month date not null,
  participant_key text not null,
  amount bigint,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  primary key (period_month, participant_key),
  constraint participant_salaries_known_recipient check (
    participant_key in ('salework-accounting-sales', 'amis-kim-huong', 'amis-dang-khoa')
  ),
  constraint participant_salaries_month_first_day check (extract(day from period_month) = 1),
  constraint participant_salaries_amount_nonnegative check (amount is null or amount >= 0)
);
comment on table public.monthly_participant_salaries is
  'Lương Admin nhập theo tháng cho nhân viên báo cáo tháng chưa có profile Sales.';
alter table public.monthly_participant_salaries enable row level security;
alter table public.monthly_participant_salaries force row level security;
revoke all on public.monthly_participant_salaries from anon, authenticated, service_role;
grant select, insert, update on public.monthly_participant_salaries to authenticated;
create policy participant_salaries_select_admin on public.monthly_participant_salaries
  for select to authenticated using ((select public.is_admin()));
create policy participant_salaries_insert_admin on public.monthly_participant_salaries
  for insert to authenticated with check ((select public.is_admin()));
create policy participant_salaries_update_admin on public.monthly_participant_salaries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger trg_participant_salaries_updated_at
  before update on public.monthly_participant_salaries
  for each row execute function public.set_updated_at();

-- Một form chứa hai loại người nhận, lưu trong một transaction tránh lưu dở.
create function public.save_monthly_salary_entries(p_period_month date, p_entries jsonb)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare saved integer;
begin
  if not public.is_admin() then
    raise exception 'Admin required' using errcode = '42501';
  end if;
  if p_period_month is null or extract(day from p_period_month) <> 1
     or p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Invalid salary input' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_entries) as e(participant_id text, amount bigint)
    where e.participant_id is null or (
      e.participant_id not in ('salework-accounting-sales', 'amis-kim-huong', 'amis-dang-khoa')
      and not exists (
        select 1 from public.profiles p where p.role = 'SALES' and p.id = case
          when e.participant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          then e.participant_id::uuid else null end
      )
    )
  ) then
    raise exception 'Unknown salary recipient' using errcode = '22023';
  end if;
  insert into public.sales_monthly_salaries(period_month, sales_id, amount, updated_by)
    select p_period_month, participant_id::uuid, amount, auth.uid()
    from jsonb_to_recordset(p_entries) as e(participant_id text, amount bigint)
    where participant_id not in ('salework-accounting-sales', 'amis-kim-huong', 'amis-dang-khoa')
    on conflict (period_month, sales_id) do update set amount = excluded.amount, updated_by = excluded.updated_by;
  insert into public.monthly_participant_salaries(period_month, participant_key, amount, updated_by)
    select p_period_month, participant_id, amount, auth.uid()
    from jsonb_to_recordset(p_entries) as e(participant_id text, amount bigint)
    where participant_id in ('salework-accounting-sales', 'amis-kim-huong', 'amis-dang-khoa')
    on conflict (period_month, participant_key) do update set amount = excluded.amount, updated_by = excluded.updated_by;
  saved := jsonb_array_length(p_entries);
  return saved;
end;
$$;
revoke all on function public.save_monthly_salary_entries(date, jsonb) from public, anon, service_role;
grant execute on function public.save_monthly_salary_entries(date, jsonb) to authenticated;
