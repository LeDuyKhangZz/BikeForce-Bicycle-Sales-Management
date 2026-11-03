-- Balance snapshots captured from Shopee Seller Center by desktop automation.

create table public.shopee_ad_balance_snapshots (
  id bigint generated always as identity primary key,
  available_cash_balance bigint not null,
  currency_code text not null default 'VND',
  captured_at timestamptz not null,
  synced_at timestamptz not null default now(),
  constraint shopee_ad_balance_nonnegative
    check (available_cash_balance >= 0),
  constraint shopee_ad_balance_currency
    check (currency_code = 'VND'),
  constraint shopee_ad_balance_snapshot_unique
    unique (captured_at)
);

alter table public.shopee_ad_balance_snapshots enable row level security;
alter table public.shopee_ad_balance_snapshots force row level security;

revoke all on public.shopee_ad_balance_snapshots from anon, authenticated, service_role;
grant select on public.shopee_ad_balance_snapshots to authenticated;

create policy shopee_ad_balance_select_admin
  on public.shopee_ad_balance_snapshots for select to authenticated
  using ((select public.is_admin()));

create index shopee_ad_balance_captured_idx
  on public.shopee_ad_balance_snapshots (captured_at desc);

create or replace function public.insert_shopee_ad_balance_snapshot(
  p_available_cash_balance bigint,
  p_currency_code text,
  p_captured_at timestamptz
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  snapshot_id bigint;
begin
  if p_available_cash_balance is null
     or p_available_cash_balance < 0
     or p_currency_code <> 'VND'
     or p_captured_at is null
     or p_captured_at > now() + interval '5 minutes'
     or p_captured_at < now() - interval '7 days' then
    raise exception 'Invalid Shopee balance snapshot';
  end if;

  insert into public.shopee_ad_balance_snapshots (
    available_cash_balance, currency_code, captured_at
  ) values (
    p_available_cash_balance, p_currency_code, p_captured_at
  )
  on conflict (captured_at) do update set
    available_cash_balance = excluded.available_cash_balance,
    currency_code = excluded.currency_code,
    synced_at = now()
  returning id into snapshot_id;

  return snapshot_id;
end;
$$;

revoke all on function public.insert_shopee_ad_balance_snapshot(bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.insert_shopee_ad_balance_snapshot(bigint,text,timestamptz)
  to service_role;

comment on function public.insert_shopee_ad_balance_snapshot(bigint,text,timestamptz) is
  'Inserts one validated Shopee Ads balance snapshot; callable only by the automation worker.';

create or replace function public.get_marketplace_ad_finance_summary()
returns table(
  marketplace_code text,
  ads_top_up bigint,
  available_balance bigint,
  balance_captured_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    top_up.marketplace_code,
    top_up.amount,
    case
      when top_up.marketplace_code = 'TIKTOK' then tiktok.available_cash_balance
      when top_up.marketplace_code = 'SHOPEE' then shopee.available_cash_balance
    end,
    case
      when top_up.marketplace_code = 'TIKTOK' then tiktok.captured_at
      when top_up.marketplace_code = 'SHOPEE' then shopee.captured_at
    end
  from public.marketplace_ad_top_ups top_up
  left join lateral (
    select available_cash_balance, captured_at
    from public.tiktok_ad_balance_snapshots
    order by captured_at desc
    limit 1
  ) tiktok on top_up.marketplace_code = 'TIKTOK'
  left join lateral (
    select available_cash_balance, captured_at
    from public.shopee_ad_balance_snapshots
    order by captured_at desc
    limit 1
  ) shopee on top_up.marketplace_code = 'SHOPEE'
  order by top_up.marketplace_code;
$$;

revoke all on function public.get_marketplace_ad_finance_summary() from public, anon;
grant execute on function public.get_marketplace_ad_finance_summary()
  to authenticated, service_role;
