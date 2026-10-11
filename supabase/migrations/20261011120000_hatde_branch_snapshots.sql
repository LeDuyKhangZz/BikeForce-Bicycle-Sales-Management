-- Hạt Dẻ Ông Lý: snapshot doanh thu theo thời điểm và chi tiết sáu chi nhánh.

create table public.hatde_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  report_time text not null,
  total_revenue bigint not null,
  total_transactions integer not null,
  created_at timestamptz not null default now(),
  constraint hatde_snapshots_report_time_format check (
    report_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  constraint hatde_snapshots_totals_nonnegative check (
    total_revenue >= 0 and total_transactions >= 0
  ),
  constraint hatde_snapshots_date_time_unique unique (report_date, report_time)
);

create table public.hatde_branch_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.hatde_snapshots(id) on delete cascade,
  branch_code text not null,
  revenue bigint not null,
  transactions integer not null,
  vs_yesterday numeric not null,
  vs_last_week numeric not null,
  constraint hatde_branch_snapshots_branch_code check (
    branch_code in (
      'cn_15h',
      'lotte_gold_coast',
      'lotte_2310',
      'lotte_vung_tau',
      'passio_pho_quang',
      'passio_dong_den'
    )
  ),
  constraint hatde_branch_snapshots_values_nonnegative check (
    revenue >= 0 and transactions >= 0
  ),
  constraint hatde_branch_snapshots_snapshot_branch_unique unique (snapshot_id, branch_code)
);

alter table public.hatde_snapshots enable row level security;
alter table public.hatde_snapshots force row level security;
alter table public.hatde_branch_snapshots enable row level security;
alter table public.hatde_branch_snapshots force row level security;

revoke all on public.hatde_snapshots from anon, authenticated, service_role;
revoke all on public.hatde_branch_snapshots from anon, authenticated, service_role;
grant select on public.hatde_snapshots to authenticated;
grant select on public.hatde_branch_snapshots to authenticated;

create policy hatde_snapshots_select_admin
  on public.hatde_snapshots for select to authenticated
  using ((select public.is_admin()));

create policy hatde_branch_snapshots_select_admin
  on public.hatde_branch_snapshots for select to authenticated
  using ((select public.is_admin()));

create index hatde_snapshots_latest_idx
  on public.hatde_snapshots (report_date desc, report_time desc);

create index hatde_branch_snapshots_revenue_idx
  on public.hatde_branch_snapshots (snapshot_id, revenue desc);

create or replace function public.upsert_hatde_snapshot(
  p_report_date date,
  p_report_time text,
  p_total_revenue bigint,
  p_total_transactions integer,
  p_branches jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  snapshot_uuid uuid;
  snapshot_created boolean;
  branch_count integer;
  branch_revenue bigint;
  branch_transactions bigint;
begin
  if p_report_date is null
     or p_report_time is null
     or p_report_time !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
     or p_total_revenue is null
     or p_total_transactions is null
     or p_total_revenue < 0
     or p_total_transactions < 0
     or p_branches is null
     or jsonb_typeof(p_branches) <> 'array'
     or jsonb_array_length(p_branches) > 6 then
    raise exception 'Invalid Hat De snapshot';
  end if;

  select count(*), coalesce(sum(x.revenue), 0), coalesce(sum(x.transactions), 0)
  into branch_count, branch_revenue, branch_transactions
  from jsonb_to_recordset(p_branches) as x(
    branch_code text,
    revenue bigint,
    transactions integer,
    vs_yesterday numeric,
    vs_last_week numeric
  )
  where x.branch_code in (
    'cn_15h', 'lotte_gold_coast', 'lotte_2310',
    'lotte_vung_tau', 'passio_pho_quang', 'passio_dong_den'
  )
    and x.revenue >= 0
    and x.transactions >= 0
    and not (x.revenue = 0 and x.transactions = 0)
    and x.vs_yesterday is not null
    and x.vs_last_week is not null;

  if branch_count <> jsonb_array_length(p_branches)
     or branch_revenue <> p_total_revenue
     or branch_transactions <> p_total_transactions
     or (
       select count(distinct x.branch_code)
       from jsonb_to_recordset(p_branches) as x(branch_code text)
     ) <> branch_count then
    raise exception 'Invalid or inconsistent Hat De branch data';
  end if;

  insert into public.hatde_snapshots (
    report_date, report_time, total_revenue, total_transactions
  ) values (
    p_report_date, p_report_time, p_total_revenue, p_total_transactions
  )
  on conflict (report_date, report_time) do nothing
  returning id into snapshot_uuid;

  snapshot_created := snapshot_uuid is not null;

  if not snapshot_created then
    select id into snapshot_uuid
    from public.hatde_snapshots
    where report_date = p_report_date and report_time = p_report_time
    for update;

    update public.hatde_snapshots set
      total_revenue = p_total_revenue,
      total_transactions = p_total_transactions
    where id = snapshot_uuid;
  end if;

  delete from public.hatde_branch_snapshots where snapshot_id = snapshot_uuid;

  insert into public.hatde_branch_snapshots (
    snapshot_id, branch_code, revenue, transactions, vs_yesterday, vs_last_week
  )
  select
    snapshot_uuid,
    x.branch_code,
    x.revenue,
    x.transactions,
    x.vs_yesterday,
    x.vs_last_week
  from jsonb_to_recordset(p_branches) as x(
    branch_code text,
    revenue bigint,
    transactions integer,
    vs_yesterday numeric,
    vs_last_week numeric
  );

  return jsonb_build_object('id', snapshot_uuid, 'created', snapshot_created);
end;
$$;

revoke all on function public.upsert_hatde_snapshot(
  date, text, bigint, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.upsert_hatde_snapshot(
  date, text, bigint, integer, jsonb
) to service_role;

comment on function public.upsert_hatde_snapshot(
  date, text, bigint, integer, jsonb
) is 'Upsert nguyên tử snapshot Hạt Dẻ và chi tiết chi nhánh; chỉ webhook service_role được gọi.';
