-- Snapshot tài chính theo sàn từ Pancake analytics/sale (DEC-117).

create table public.pancake_marketplace_financial_reports (
  report_date date not null,
  shop_id bigint not null,
  marketplace_code text not null,
  currency_code text not null,
  delivered_count integer not null,
  gross_sales bigint not null,
  shop_discount bigint not null,
  marketplace_voucher bigint not null,
  marketplace_fee bigint not null,
  platform_receivable bigint not null,
  cod bigint not null,
  prepaid bigint not null,
  capital bigint not null,
  payment_fee bigint not null,
  seller_transaction_fee bigint not null,
  service_fee bigint not null,
  sfp_service_fee bigint not null,
  affiliate_commission bigint not null,
  platform_commission bigint not null,
  platform_shipping_fee bigint not null,
  diff_shipping_fee bigint not null,
  marketplace_tax bigint not null,
  marketing_fee bigint not null,
  ads_top_up bigint not null,
  synced_at timestamptz not null default now(),
  primary key (report_date, shop_id, marketplace_code),
  constraint pancake_marketplace_financial_shop check (shop_id = 1022081353),
  constraint pancake_marketplace_financial_marketplace
    check (marketplace_code in ('SHOPEE', 'TIKTOK')),
  constraint pancake_marketplace_financial_currency check (currency_code = 'VND'),
  constraint pancake_marketplace_financial_nonnegative check (
    delivered_count >= 0 and gross_sales >= 0 and shop_discount >= 0
    and marketplace_voucher >= 0 and marketplace_fee >= 0
    and platform_receivable >= 0 and cod >= 0 and capital >= 0
    and payment_fee >= 0 and seller_transaction_fee >= 0 and service_fee >= 0
    and sfp_service_fee >= 0 and affiliate_commission >= 0
    and platform_commission >= 0 and platform_shipping_fee >= 0
    and marketplace_tax >= 0 and marketing_fee >= 0 and ads_top_up >= 0
  ),
  constraint pancake_marketplace_financial_receivable check (
    platform_receivable = gross_sales - shop_discount + marketplace_voucher - marketplace_fee
  )
);

alter table public.pancake_marketplace_financial_reports enable row level security;
alter table public.pancake_marketplace_financial_reports force row level security;

revoke all on public.pancake_marketplace_financial_reports from anon, authenticated, service_role;
grant select on public.pancake_marketplace_financial_reports to authenticated;

create policy pancake_marketplace_financial_select_admin
  on public.pancake_marketplace_financial_reports for select to authenticated
  using ((select public.is_admin()));

create index pancake_marketplace_financial_shop_date_idx
  on public.pancake_marketplace_financial_reports (shop_id, report_date desc);

create or replace function public.upsert_pancake_marketplace_financials(
  p_report_date date,
  p_shop_id bigint,
  p_currency_code text,
  p_marketplaces jsonb
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  marketplace_count integer;
begin
  if p_report_date is null
     or p_shop_id <> 1022081353
     or p_currency_code <> 'VND'
     or p_marketplaces is null
     or jsonb_typeof(p_marketplaces) <> 'array'
     or jsonb_array_length(p_marketplaces) > 2 then
    raise exception 'Invalid Pancake marketplace financial report';
  end if;

  delete from public.pancake_marketplace_financial_reports
  where report_date = p_report_date and shop_id = p_shop_id;

  insert into public.pancake_marketplace_financial_reports (
    report_date, shop_id, marketplace_code, currency_code, delivered_count,
    gross_sales, shop_discount, marketplace_voucher, marketplace_fee,
    platform_receivable, cod, prepaid, capital, payment_fee,
    seller_transaction_fee, service_fee, sfp_service_fee, affiliate_commission,
    platform_commission, platform_shipping_fee, diff_shipping_fee,
    marketplace_tax, marketing_fee, ads_top_up, synced_at
  )
  select
    p_report_date, p_shop_id, x.marketplace_code, p_currency_code, x.delivered_count,
    x.gross_sales, x.shop_discount, x.marketplace_voucher, x.marketplace_fee,
    x.platform_receivable, x.cod, x.prepaid, x.capital, x.payment_fee,
    x.seller_transaction_fee, x.service_fee, x.sfp_service_fee, x.affiliate_commission,
    x.platform_commission, x.platform_shipping_fee, x.diff_shipping_fee,
    x.marketplace_tax, x.marketing_fee, x.ads_top_up, now()
  from jsonb_to_recordset(p_marketplaces) as x(
    marketplace_code text,
    delivered_count integer,
    gross_sales bigint,
    shop_discount bigint,
    marketplace_voucher bigint,
    marketplace_fee bigint,
    platform_receivable bigint,
    cod bigint,
    prepaid bigint,
    capital bigint,
    payment_fee bigint,
    seller_transaction_fee bigint,
    service_fee bigint,
    sfp_service_fee bigint,
    affiliate_commission bigint,
    platform_commission bigint,
    platform_shipping_fee bigint,
    diff_shipping_fee bigint,
    marketplace_tax bigint,
    marketing_fee bigint,
    ads_top_up bigint
  );
  get diagnostics marketplace_count = row_count;

  if marketplace_count <> jsonb_array_length(p_marketplaces) then
    raise exception 'Incomplete Pancake marketplace financial report';
  end if;

  return marketplace_count;
end;
$$;

revoke all on function public.upsert_pancake_marketplace_financials(date,bigint,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_pancake_marketplace_financials(date,bigint,text,jsonb)
  to service_role;

comment on function public.upsert_pancake_marketplace_financials(date,bigint,text,jsonb)
  is 'Thay snapshot tài chính Pancake theo ngày/sàn; chỉ worker service_role được gọi.';
