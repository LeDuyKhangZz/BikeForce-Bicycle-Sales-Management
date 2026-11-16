-- Chỉ worker được ghi sự kiện SaleWork; không cấp DML bảng cho service_role.
create or replace function public.sync_salework_care_logs(p_events jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_event record;
  v_sales_id uuid;
  v_source_id uuid;
  v_customer_id uuid;
  v_matches integer;
  v_written integer := 0;
  v_unmatched_sales integer := 0;
  v_unmatched_customers integer := 0;
  v_unlinked integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array'
    or jsonb_array_length(p_events) > 500 then
    raise exception 'Expected at most 500 SaleWork care events';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_events) e(
      account_id text, peer_id text, message_id text, sales_name text, occurred_at timestamptz
    ) where e.account_id is null or e.account_id !~ '^[A-Za-z0-9_-]{1,200}$'
      or e.peer_id is null or e.peer_id !~ '^[A-Za-z0-9_-]{1,200}$'
      or e.message_id is null or e.message_id !~ '^[A-Za-z0-9_-]{1,200}$'
      or nullif(btrim(e.sales_name), '') is null
      or e.occurred_at is null or not isfinite(e.occurred_at)
      or e.occurred_at > now() + interval '5 minutes'
  ) then raise exception 'Invalid SaleWork care event'; end if;

  for v_event in select * from jsonb_to_recordset(p_events) e(
    account_id text, peer_id text, message_id text, sales_name text, occurred_at timestamptz
  ) loop
    select count(*), min(p.id::text)::uuid into v_matches, v_sales_id
    from public.profiles p
    where p.full_name = v_event.sales_name and p.role = 'SALES' and p.is_active;
    if v_matches <> 1 then
      v_unmatched_sales := v_unmatched_sales + 1;
      continue;
    end if;

    -- Chỉ định danh nguồn chính xác. Không ghép gần đúng tên/số điện thoại.
    select c.id into v_source_id from public.customers c
    where c.source_system = 'SALEWORK_ZALO'
      and c.zalo_account = v_event.account_id
      and c.source_id in (
        'FRIEND:' || v_event.account_id || ':' || v_event.peer_id,
        'CONTACT:' || v_event.account_id || ':' || v_event.peer_id,
        'REQUEST:' || v_event.account_id || ':' || v_event.peer_id
      )
    order by case split_part(c.source_id, ':', 1)
      when 'FRIEND' then 1 when 'CONTACT' then 2 else 3 end
    limit 1;
    if v_source_id is null then
      v_unmatched_customers := v_unmatched_customers + 1;
      continue;
    end if;
    select l.canonical_customer_id into v_customer_id
    from public.customer_identity_links l where l.source_customer_id = v_source_id;
    if v_customer_id is null then
      v_unlinked := v_unlinked + 1;
      v_customer_id := v_source_id;
    end if;

    insert into public.care_logs (
      source_system, source_id, customer_id, sales_id, channel, direction, occurred_at
    ) values (
      'SALEWORK', 'ZALO:' || v_event.account_id || ':' || v_event.peer_id || ':' || v_event.message_id,
      v_customer_id, v_sales_id, 'ZALO', 'OUTBOUND', v_event.occurred_at
    ) on conflict (source_system, source_id) do update set
      customer_id = excluded.customer_id, sales_id = excluded.sales_id,
      occurred_at = excluded.occurred_at, synced_at = now()
    where (care_logs.customer_id, care_logs.sales_id, care_logs.occurred_at)
      is distinct from (excluded.customer_id, excluded.sales_id, excluded.occurred_at);
    if found then v_written := v_written + 1; end if;
  end loop;
  return jsonb_build_object('received', jsonb_array_length(p_events), 'written', v_written,
    'unmatched_sales', v_unmatched_sales, 'unmatched_customers', v_unmatched_customers,
    'unlinked', v_unlinked);
end;
$$;
revoke all on function public.sync_salework_care_logs(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.sync_salework_care_logs(jsonb) to service_role;

-- Đọc ngày chăm sóc bằng mã MISA đã được Admin duyệt liên kết.
-- SECURITY DEFINER cần thiết vì Sales không được đọc bảng customer_identity_links.
-- Hàm kiểm tra quyền từng khách/từng log, không cho service_role/anon đọc.
create or replace function public.get_linked_salework_care_date(p_customer_code text, p_reference_date date)
returns date
language sql stable security definer set search_path = public, pg_temp
as $$
  select max((cl.occurred_at at time zone 'Asia/Ho_Chi_Minh')::date)
  from public.customers canonical
  join public.care_logs cl on cl.customer_id in (
    select canonical.id
    union all
    select l.source_customer_id from public.customer_identity_links l
    where l.canonical_customer_id = canonical.id
  )
  where canonical.source_system = 'MISA' and canonical.customer_code = p_customer_code
    and nullif(btrim(p_customer_code), '') is not null and p_reference_date is not null
    and cl.source_system = 'SALEWORK' and cl.channel = 'ZALO' and cl.direction = 'OUTBOUND'
    and cl.occurred_at < ((least(p_reference_date, public.vn_today()) + 1)::timestamp
      at time zone 'Asia/Ho_Chi_Minh')
    and (
      (select public.is_admin())
      or ((select public.is_active_sales()) and (
        cl.sales_id = (select auth.uid()) or canonical.assigned_sales_id = (select auth.uid())
      ))
    );
$$;
revoke all on function public.get_linked_salework_care_date(text,date) from public, anon, service_role;
grant execute on function public.get_linked_salework_care_date(text,date) to authenticated;

-- Giữ nguyên ngày ghé thăm MISA; thêm ngày chăm sóc hiệu lực cho filter/count/UI.
create or replace view public.misa_customer_care_snapshot with (security_invoker = true) as
select c.period_month, c.misa_employee_id, c.misa_customer_id, c.customer_code,
  c.customer_name, c.billing_province, c.debt, c.order_sales,
  c.recent_purchase_date, c.days_without_purchase, c.last_visit_date,
  c.owner_name, c.phone, c.synced_at,
  greatest(
    c.last_visit_date,
    (select max(s.care_date) from public.customer_care_submissions s
      where s.misa_customer_id = c.misa_customer_id and s.status = 'APPROVED'),
    public.get_linked_salework_care_date(c.customer_code,
      least(public.vn_today(), (c.period_month + interval '1 month - 1 day')::date))
  ) as last_care_date
from public.misa_report119_customers c;
revoke all on public.misa_customer_care_snapshot from public, anon, authenticated, service_role;
grant select on public.misa_customer_care_snapshot to authenticated;

comment on function public.sync_salework_care_logs(jsonb) is
  'Worker-only, idempotent SaleWork outbound care ingestion; exact source IDs, explicit Sales mapping, approved identity links.';
comment on view public.misa_customer_care_snapshot is
  'Caller-RLS MISA snapshot plus last care date from visits, approved submissions and authorized SaleWork outbound messages.';
