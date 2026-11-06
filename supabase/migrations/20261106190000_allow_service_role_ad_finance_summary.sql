-- Cho phép automation client (service_role) gọi get_marketplace_ad_finance_summary()
-- khi vẽ ảnh báo cáo Sàn TMĐT (/api/salework/report-image), đồng thời giữ nguyên
-- chặn Sales/anon (chỉ Admin hoặc service_role mới được phép đọc).

create or replace function public.get_marketplace_ad_finance_summary()
returns table(marketplace_code text, ads_top_up bigint, available_balance bigint, balance_captured_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and current_user <> 'service_role'
     and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

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

revoke all on function public.get_marketplace_ad_finance_summary() from public, anon;
grant execute on function public.get_marketplace_ad_finance_summary() to authenticated, service_role;

