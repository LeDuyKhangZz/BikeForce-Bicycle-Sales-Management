create table public.marketplace_ad_top_ups (
  marketplace_code text primary key check (marketplace_code in ('TIKTOK', 'SHOPEE')),
  amount bigint not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.marketplace_ad_top_ups enable row level security;
alter table public.marketplace_ad_top_ups force row level security;
revoke all on public.marketplace_ad_top_ups from anon, authenticated, service_role;
grant select on public.marketplace_ad_top_ups to authenticated;
create policy marketplace_ad_top_ups_admin_select on public.marketplace_ad_top_ups
  for select to authenticated using ((select public.is_admin()));

insert into public.marketplace_ad_top_ups (marketplace_code, amount)
values ('TIKTOK', 0), ('SHOPEE', 0);

create or replace function public.set_marketplace_ad_top_up(p_marketplace_code text, p_amount bigint)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  if p_marketplace_code not in ('TIKTOK', 'SHOPEE') or p_amount is null or p_amount < 0 then
    raise exception 'Invalid marketplace ad top-up';
  end if;
  insert into public.marketplace_ad_top_ups (marketplace_code, amount, updated_at, updated_by)
  values (p_marketplace_code, p_amount, now(), auth.uid())
  on conflict (marketplace_code) do update set amount = excluded.amount, updated_at = now(), updated_by = auth.uid();
end; $$;

create or replace function public.get_marketplace_ad_finance_summary()
returns table(marketplace_code text, ads_top_up bigint, available_balance bigint, balance_captured_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.marketplace_code, s.amount,
    case when s.marketplace_code = 'TIKTOK' then b.available_cash_balance end,
    case when s.marketplace_code = 'TIKTOK' then b.captured_at end
  from public.marketplace_ad_top_ups s
  left join lateral (
    select available_cash_balance, captured_at from public.tiktok_ad_balance_snapshots
    order by captured_at desc limit 1
  ) b on s.marketplace_code = 'TIKTOK'
  order by s.marketplace_code;
$$;

revoke all on function public.set_marketplace_ad_top_up(text,bigint) from public, anon;
grant execute on function public.set_marketplace_ad_top_up(text,bigint) to authenticated;
revoke all on function public.get_marketplace_ad_finance_summary() from public, anon;
grant execute on function public.get_marketplace_ad_finance_summary() to authenticated, service_role;
