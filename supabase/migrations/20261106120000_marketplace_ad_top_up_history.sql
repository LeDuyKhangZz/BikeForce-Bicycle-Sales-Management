create table public.marketplace_ad_top_up_history (
  id bigint generated always as identity primary key,
  marketplace_code text not null check (marketplace_code in ('TIKTOK', 'SHOPEE')),
  event_type text not null check (event_type in ('OPENING_BALANCE', 'DEPOSIT')),
  previous_amount bigint not null check (previous_amount >= 0),
  deposit_amount bigint not null check (deposit_amount >= 0),
  new_amount bigint not null check (new_amount >= previous_amount),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  constraint marketplace_ad_top_up_history_math
    check (new_amount = previous_amount + deposit_amount),
  constraint marketplace_ad_top_up_history_event_amount
    check ((event_type = 'OPENING_BALANCE' and deposit_amount = 0)
      or (event_type = 'DEPOSIT' and deposit_amount > 0))
);

alter table public.marketplace_ad_top_up_history enable row level security;
alter table public.marketplace_ad_top_up_history force row level security;
revoke all on public.marketplace_ad_top_up_history from anon, authenticated, service_role;
grant select on public.marketplace_ad_top_up_history to authenticated;
create policy marketplace_ad_top_up_history_admin_select
  on public.marketplace_ad_top_up_history for select to authenticated
  using ((select public.is_admin()));
create index marketplace_ad_top_up_history_recent_idx
  on public.marketplace_ad_top_up_history (marketplace_code, created_at desc, id desc);

-- Preserve existing totals as opening balances instead of fabricating old deposit events.
insert into public.marketplace_ad_top_up_history (
  marketplace_code, event_type, previous_amount, deposit_amount, new_amount, created_at, created_by
)
select marketplace_code, 'OPENING_BALANCE', amount, 0, amount, updated_at, updated_by
from public.marketplace_ad_top_ups;

create or replace function public.set_marketplace_ad_top_up(p_marketplace_code text, p_amount bigint)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_previous bigint;
  v_next bigint;
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if p_marketplace_code not in ('TIKTOK', 'SHOPEE') or p_amount is null or p_amount <= 0 then
    raise exception 'Invalid marketplace ad deposit';
  end if;
  select amount into v_previous from public.marketplace_ad_top_ups
    where marketplace_code = p_marketplace_code for update;
  if not found then raise exception 'Marketplace ad top-up total is missing'; end if;
  if p_amount > 9223372036854775807 - v_previous then raise exception 'Marketplace ad top-up total overflow'; end if;
  v_next := v_previous + p_amount;
  update public.marketplace_ad_top_ups
    set amount = v_next, updated_at = now(), updated_by = auth.uid()
    where marketplace_code = p_marketplace_code;
  insert into public.marketplace_ad_top_up_history (
    marketplace_code, event_type, previous_amount, deposit_amount, new_amount, created_by
  ) values (p_marketplace_code, 'DEPOSIT', v_previous, p_amount, v_next, auth.uid());
end;
$$;

create or replace function public.get_marketplace_ad_finance_summary()
returns table(marketplace_code text, ads_top_up bigint, available_balance bigint, balance_captured_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  return query
  select top_up.marketplace_code, top_up.amount,
    case when top_up.marketplace_code = 'TIKTOK' then tiktok.available_cash_balance
         when top_up.marketplace_code = 'SHOPEE' then shopee.available_cash_balance end,
    case when top_up.marketplace_code = 'TIKTOK' then tiktok.captured_at
         when top_up.marketplace_code = 'SHOPEE' then shopee.captured_at end
  from public.marketplace_ad_top_ups top_up
  left join lateral (
    select available_cash_balance, captured_at from public.tiktok_ad_balance_snapshots
    order by captured_at desc limit 1
  ) tiktok on top_up.marketplace_code = 'TIKTOK'
  left join lateral (
    select available_cash_balance, captured_at from public.shopee_ad_balance_snapshots
    order by captured_at desc limit 1
  ) shopee on top_up.marketplace_code = 'SHOPEE'
  union all
  select history.marketplace_code || '_HISTORY', history.deposit_amount, history.new_amount, history.created_at
  from (
    select h.*, row_number() over (
      partition by h.marketplace_code order by h.created_at desc, h.id desc
    ) as row_num
    from public.marketplace_ad_top_up_history h
  ) history
  where history.row_num <= 20;
end;
$$;

comment on table public.marketplace_ad_top_up_history is
  'Append-only audit trail for cumulative TikTok and Shopee advertising deposits.';
comment on function public.set_marketplace_ad_top_up(text,bigint) is
  'Adds one positive deposit to the cumulative marketplace total and records before/added/after atomically.';
comment on function public.get_marketplace_ad_finance_summary() is
  'Admin finance totals plus up to 20 recent history rows per marketplace, identified by *_HISTORY codes.';
