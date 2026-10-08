-- Báo cáo đơn hàng Pancake theo ngày cho module Sàn TMĐT.

create table public.pancake_daily_reports (
  report_date date not null,
  shop_id bigint not null,
  employee_name text not null default 'Trần Minh Triết',
  order_count integer not null,
  revenue bigint not null,
  cancelled_count integer not null,
  returned_count integer not null,
  late_count integer not null,
  ads_order_count integer not null,
  ads_gmv bigint not null,
  synced_at timestamptz not null default now(),
  primary key (report_date, shop_id),
  constraint pancake_daily_reports_shop check (shop_id = 1022081353),
  constraint pancake_daily_reports_employee check (employee_name = 'Trần Minh Triết'),
  constraint pancake_daily_reports_counts_nonnegative check (
    order_count >= 0
    and cancelled_count >= 0
    and returned_count >= 0
    and late_count >= 0
    and ads_order_count >= 0
  ),
  constraint pancake_daily_reports_money_nonnegative check (revenue >= 0 and ads_gmv >= 0),
  constraint pancake_daily_reports_count_bounds check (
    cancelled_count <= order_count
    and returned_count <= order_count - cancelled_count
    and late_count <= order_count - cancelled_count
    and ads_order_count <= order_count - cancelled_count
  ),
  constraint pancake_daily_reports_ads_gmv_bound check (ads_gmv <= revenue)
);

create table public.pancake_daily_source_reports (
  report_date date not null,
  shop_id bigint not null,
  source_name text not null,
  order_count integer not null,
  revenue bigint not null,
  synced_at timestamptz not null default now(),
  primary key (report_date, shop_id, source_name),
  foreign key (report_date, shop_id)
    references public.pancake_daily_reports(report_date, shop_id)
    on delete cascade,
  constraint pancake_daily_source_name_not_blank check (btrim(source_name) <> ''),
  constraint pancake_daily_source_values_nonnegative check (order_count >= 0 and revenue >= 0)
);

alter table public.pancake_daily_reports enable row level security;
alter table public.pancake_daily_reports force row level security;
alter table public.pancake_daily_source_reports enable row level security;
alter table public.pancake_daily_source_reports force row level security;

revoke all on public.pancake_daily_reports from anon, authenticated, service_role;
revoke all on public.pancake_daily_source_reports from anon, authenticated, service_role;
grant select on public.pancake_daily_reports to authenticated;
grant select on public.pancake_daily_source_reports to authenticated;

create policy pancake_daily_reports_select_admin
  on public.pancake_daily_reports for select to authenticated
  using ((select public.is_admin()));

create policy pancake_daily_source_reports_select_admin
  on public.pancake_daily_source_reports for select to authenticated
  using ((select public.is_admin()));

create index pancake_daily_reports_synced_at_idx
  on public.pancake_daily_reports (synced_at desc);

create or replace function public.upsert_pancake_daily_report(
  p_report_date date,
  p_shop_id bigint,
  p_order_count integer,
  p_revenue bigint,
  p_cancelled_count integer,
  p_returned_count integer,
  p_late_count integer,
  p_ads_order_count integer,
  p_ads_gmv bigint,
  p_sources jsonb
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_count integer;
  source_order_count bigint;
  source_revenue bigint;
begin
  if p_report_date is null
     or p_shop_id is null
     or p_order_count is null
     or p_revenue is null
     or p_cancelled_count is null
     or p_returned_count is null
     or p_late_count is null
     or p_ads_order_count is null
     or p_ads_gmv is null
     or p_sources is null
     or p_shop_id <> 1022081353
     or p_order_count < 0
     or p_revenue < 0
     or p_cancelled_count < 0
     or p_returned_count < 0
     or p_late_count < 0
     or p_ads_order_count < 0
     or p_ads_gmv < 0
     or p_cancelled_count > p_order_count
     or p_returned_count > p_order_count - p_cancelled_count
     or p_late_count > p_order_count - p_cancelled_count
     or p_ads_order_count > p_order_count - p_cancelled_count
     or p_ads_gmv > p_revenue
     or jsonb_typeof(p_sources) <> 'array' then
    raise exception 'Invalid Pancake daily report';
  end if;

  select
    coalesce(sum(x.order_count), 0),
    coalesce(sum(x.revenue), 0)
  into source_order_count, source_revenue
  from jsonb_to_recordset(p_sources) as x(
    source_name text,
    order_count integer,
    revenue bigint
  );

  if source_order_count <> p_order_count - p_cancelled_count
     or source_revenue <> p_revenue then
    raise exception 'Pancake source totals do not match daily report';
  end if;

  insert into public.pancake_daily_reports (
    report_date, shop_id, employee_name, order_count, revenue,
    cancelled_count, returned_count, late_count, ads_order_count, ads_gmv, synced_at
  ) values (
    p_report_date, p_shop_id, 'Trần Minh Triết', p_order_count, p_revenue,
    p_cancelled_count, p_returned_count, p_late_count, p_ads_order_count, p_ads_gmv, now()
  )
  on conflict (report_date, shop_id) do update set
    employee_name = excluded.employee_name,
    order_count = excluded.order_count,
    revenue = excluded.revenue,
    cancelled_count = excluded.cancelled_count,
    returned_count = excluded.returned_count,
    late_count = excluded.late_count,
    ads_order_count = excluded.ads_order_count,
    ads_gmv = excluded.ads_gmv,
    synced_at = now();

  delete from public.pancake_daily_source_reports
  where report_date = p_report_date and shop_id = p_shop_id;

  insert into public.pancake_daily_source_reports (
    report_date, shop_id, source_name, order_count, revenue, synced_at
  )
  select p_report_date, p_shop_id, btrim(x.source_name), x.order_count, x.revenue, now()
  from jsonb_to_recordset(p_sources) as x(
    source_name text,
    order_count integer,
    revenue bigint
  );
  get diagnostics source_count = row_count;

  if source_count <> jsonb_array_length(p_sources) then
    raise exception 'Incomplete Pancake source report';
  end if;

  return source_count;
end;
$$;

revoke all on function public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb
) from public, anon, authenticated;
grant execute on function public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb
) to service_role;

comment on function public.upsert_pancake_daily_report(
  date, bigint, integer, bigint, integer, integer, integer, integer, bigint, jsonb
) is 'Upsert nguyên tử báo cáo Pancake một ngày và chi tiết nguồn; chỉ worker service_role được gọi.';
