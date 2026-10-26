-- Đưa snapshot tài chính theo sàn vào RPC ảnh Pancake (DEC-117).

create or replace function public.get_latest_pancake_report_image()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked as (
    select r.*, row_number() over (partition by r.shop_id order by r.report_date desc) as row_rank
    from public.pancake_daily_reports r
    where r.shop_id in (1022081353, 1943148428)
  )
  select jsonb_build_object(
    'reports', coalesce(jsonb_agg(
      jsonb_build_object(
        'daily', to_jsonb(r) - 'row_rank',
        'sources', coalesce((
          select jsonb_agg(to_jsonb(s) order by s.source_name)
          from public.pancake_daily_source_reports s
          where s.report_date = r.report_date and s.shop_id = r.shop_id
        ), '[]'::jsonb),
        'financials', coalesce((
          select jsonb_agg(to_jsonb(f) order by f.marketplace_code)
          from public.pancake_marketplace_financial_reports f
          where f.report_date = r.report_date and f.shop_id = r.shop_id
        ), '[]'::jsonb)
      ) order by case r.market_code when 'VN' then 1 else 2 end
    ), '[]'::jsonb)
  )
  from ranked r
  where r.row_rank = 1;
$$;

comment on function public.get_latest_pancake_report_image()
  is 'Snapshot mới nhất đơn hàng, nguồn và tài chính từng sàn cho route ảnh; chỉ service_role.';
