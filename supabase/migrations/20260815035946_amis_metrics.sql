-- BikeForce 0009 — cầu nối số liệu MISA AMIS
-- Số liệu ở đây là LUỸ KẾ THÁNG, đẩy lên bởi script ngoài (không phải app).

-- Tên nhân viên trên AMIS không trùng tên trong profiles -> cần cột ánh xạ.
alter table public.profiles
  add column amis_employee_name text;

create unique index profiles_amis_employee_name_key
  on public.profiles (amis_employee_name)
  where amis_employee_name is not null;

create table public.amis_employee_metrics (
  period_month  date not null,
  employee_name text not null,

  -- CRM report 119 (test_crm_customer_stats.py / crawl_nvkd.py)
  net_sales                     numeric(18,2),
  sales                         numeric(18,2),
  return_sales                  numeric(18,2),
  no_of_orders                  integer,
  qty_account_in_charge         integer,
  qty_account_interactive       integer,
  qty_account_sold              integer,
  qty_account_sold_this_period  integer,

  -- CRM dashboard doanh số (test_amis_revenue.py)
  target_amount   numeric(18,2),
  current_amount  numeric(18,2),

  -- AMIS Kế toán (test_act_receivable.py)
  receive_amount  numeric(18,2),

  org_unit_name text,
  synced_at     timestamptz not null default now(),

  primary key (period_month, employee_name)
);

comment on table public.amis_employee_metrics is
  'Số liệu luỹ kế tháng từ MISA AMIS. Nguồn sự thật là AMIS; bảng này chỉ để đọc.';

alter table public.amis_employee_metrics enable row level security;

create policy "amis_metrics_select_admin"
  on public.amis_employee_metrics for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

create policy "amis_metrics_select_own"
  on public.amis_employee_metrics for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.amis_employee_name = amis_employee_metrics.employee_name
    )
  );

grant select on public.amis_employee_metrics to authenticated;
grant select, insert, update, delete on public.amis_employee_metrics to service_role;

create index amis_employee_metrics_period_idx
  on public.amis_employee_metrics (period_month desc);
  