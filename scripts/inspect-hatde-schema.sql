-- Chỉ đọc: đối chiếu định nghĩa Supabase đang chạy trước khi áp migration.
-- Liệt kê cả overload để nhận ra RPC khác chữ ký trong schema public.
select p.oid::regprocedure as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'upsert_hatde_snapshot';

select table_name, column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('hatde_snapshots', 'hatde_branch_snapshots')
order by table_name, ordinal_position;

select conrelid::regclass as table_name, conname, contype,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.hatde_snapshots'::regclass,
                  'public.hatde_branch_snapshots'::regclass)
order by conrelid::regclass::text, conname;

select tgrelid::regclass as table_name, tgname,
       pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid in ('public.hatde_snapshots'::regclass,
                 'public.hatde_branch_snapshots'::regclass)
  and not tgisinternal;
