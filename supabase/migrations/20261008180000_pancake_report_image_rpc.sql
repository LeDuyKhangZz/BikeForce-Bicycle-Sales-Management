-- Snapshot Pancake mới nhất cho route ảnh tự động đã xác thực bằng API key.

create or replace function public.get_latest_pancake_report_image()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'daily', to_jsonb(r),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.source_name)
      from public.pancake_daily_source_reports s
      where s.report_date = r.report_date
        and s.shop_id = r.shop_id
    ), '[]'::jsonb)
  )
  from public.pancake_daily_reports r
  order by r.report_date desc
  limit 1;
$$;

revoke all on function public.get_latest_pancake_report_image() from public, anon, authenticated;
grant execute on function public.get_latest_pancake_report_image() to service_role;

comment on function public.get_latest_pancake_report_image()
  is 'Snapshot Pancake mới nhất cho route ảnh n8n; chỉ service_role được execute, không cấp SELECT bảng.';
