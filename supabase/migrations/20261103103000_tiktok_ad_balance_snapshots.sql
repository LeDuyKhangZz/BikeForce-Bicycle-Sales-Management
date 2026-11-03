-- Balance snapshots captured from TikTok Business Center by desktop automation.

create table public.tiktok_ad_balance_snapshots (
  id bigint generated always as identity primary key,
  payment_portfolio_id text not null,
  available_cash_balance bigint not null,
  currency_code text not null default 'VND',
  captured_at timestamptz not null,
  synced_at timestamptz not null default now(),
  constraint tiktok_ad_balance_portfolio_format
    check (payment_portfolio_id ~ '^[0-9]{8,32}$'),
  constraint tiktok_ad_balance_nonnegative
    check (available_cash_balance >= 0),
  constraint tiktok_ad_balance_currency
    check (currency_code = 'VND'),
  constraint tiktok_ad_balance_snapshot_unique
    unique (payment_portfolio_id, captured_at)
);

alter table public.tiktok_ad_balance_snapshots enable row level security;
alter table public.tiktok_ad_balance_snapshots force row level security;

revoke all on public.tiktok_ad_balance_snapshots from anon, authenticated, service_role;
grant select on public.tiktok_ad_balance_snapshots to authenticated;

create policy tiktok_ad_balance_select_admin
  on public.tiktok_ad_balance_snapshots for select to authenticated
  using ((select public.is_admin()));

create index tiktok_ad_balance_portfolio_captured_idx
  on public.tiktok_ad_balance_snapshots (payment_portfolio_id, captured_at desc);

create or replace function public.insert_tiktok_ad_balance_snapshot(
  p_payment_portfolio_id text,
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
  if p_payment_portfolio_id !~ '^[0-9]{8,32}$'
     or p_available_cash_balance is null
     or p_available_cash_balance < 0
     or p_currency_code <> 'VND'
     or p_captured_at is null
     or p_captured_at > now() + interval '5 minutes'
     or p_captured_at < now() - interval '7 days' then
    raise exception 'Invalid TikTok balance snapshot';
  end if;

  insert into public.tiktok_ad_balance_snapshots (
    payment_portfolio_id, available_cash_balance, currency_code, captured_at
  ) values (
    p_payment_portfolio_id, p_available_cash_balance, p_currency_code, p_captured_at
  )
  on conflict (payment_portfolio_id, captured_at) do update set
    available_cash_balance = excluded.available_cash_balance,
    currency_code = excluded.currency_code,
    synced_at = now()
  returning id into snapshot_id;

  return snapshot_id;
end;
$$;

revoke all on function public.insert_tiktok_ad_balance_snapshot(text,bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.insert_tiktok_ad_balance_snapshot(text,bigint,text,timestamptz)
  to service_role;

comment on function public.insert_tiktok_ad_balance_snapshot(text,bigint,text,timestamptz) is
  'Inserts one validated TikTok Payment Portfolio balance snapshot; callable only by the automation worker.';
