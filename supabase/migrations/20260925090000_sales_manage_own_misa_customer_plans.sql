-- Sales được nhập/sửa kế hoạch của đúng khách hàng MISA do mình phụ trách.
-- Policy Admin từ migration 20260923180000 được giữ nguyên.

grant select, insert, update on public.misa_customer_monthly_plans to authenticated;

drop policy if exists misa_customer_plans_insert_own on public.misa_customer_monthly_plans;
drop policy if exists misa_customer_plans_update_own on public.misa_customer_monthly_plans;

create policy misa_customer_plans_insert_own
  on public.misa_customer_monthly_plans for insert to authenticated
  with check (
    sales_id = (select auth.uid())
    and exists (
      select 1
      from public.misa_report119_customers c
      join public.misa_report119_employees e
        on e.period_month = c.period_month
       and e.misa_employee_id = c.misa_employee_id
      join public.profiles p on p.amis_employee_name = e.employee_name
      where c.period_month = misa_customer_monthly_plans.period_month
        and c.misa_employee_id = misa_customer_monthly_plans.misa_employee_id
        and c.misa_customer_id = misa_customer_monthly_plans.misa_customer_id
        and p.id = (select auth.uid())
        and p.role = 'SALES'
        and p.is_active
    )
  );

create policy misa_customer_plans_update_own
  on public.misa_customer_monthly_plans for update to authenticated
  using (sales_id = (select auth.uid()))
  with check (
    sales_id = (select auth.uid())
    and exists (
      select 1
      from public.misa_report119_customers c
      join public.misa_report119_employees e
        on e.period_month = c.period_month
       and e.misa_employee_id = c.misa_employee_id
      join public.profiles p on p.amis_employee_name = e.employee_name
      where c.period_month = misa_customer_monthly_plans.period_month
        and c.misa_employee_id = misa_customer_monthly_plans.misa_employee_id
        and c.misa_customer_id = misa_customer_monthly_plans.misa_customer_id
        and p.id = (select auth.uid())
        and p.role = 'SALES'
        and p.is_active
    )
  );
