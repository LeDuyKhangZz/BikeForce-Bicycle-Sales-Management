-- Chạy SAU migration 20261120030000 trên Supabase local hoặc SQL Editor.
-- ROLLBACK giữ nguyên snapshot thật nếu thời điểm này đã tồn tại.
begin;

select public.upsert_hatde_snapshot(
  p_report_date => date '2026-11-20',
  p_report_time => '09:51',
  p_total_revenue => 0::bigint,
  p_total_transactions => 0,
  p_branches => '[
    {"branch_code":"lotte_gold_coast","revenue":0,"transactions":0,"vs_yesterday":-100,"vs_last_week":-100},
    {"branch_code":"lotte_2310","revenue":0,"transactions":0,"vs_yesterday":-100,"vs_last_week":-100},
    {"branch_code":"lotte_vung_tau","revenue":0,"transactions":0,"vs_yesterday":-100,"vs_last_week":-100},
    {"branch_code":"passio_dong_den","revenue":0,"transactions":0,"vs_yesterday":-100,"vs_last_week":-100},
    {"branch_code":"bep_trung_tam","revenue":0,"transactions":0,"vs_yesterday":0,"vs_last_week":-100},
    {"branch_code":"77_oik_q11","revenue":0,"transactions":0,"vs_yesterday":0,"vs_last_week":-100}
  ]'::jsonb
);

select s.report_date, s.report_time, s.total_revenue, s.total_transactions,
       count(b.id) as branch_count, sum(b.revenue) as branch_revenue,
       sum(b.transactions) as branch_transactions,
       array_agg(b.branch_code order by b.branch_code) as branch_codes
from public.hatde_snapshots s
join public.hatde_branch_snapshots b on b.snapshot_id = s.id
where s.report_date = date '2026-11-20' and s.report_time = '09:51'
group by s.id;

rollback;
