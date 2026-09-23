-- Sales chỉ được đọc snapshot Report 119 mang đúng tên AMIS đã ánh xạ trong hồ sơ của mình.

create policy misa_report119_employees_select_own
  on public.misa_report119_employees for select to authenticated
  using (
    employee_name = (
      select p.amis_employee_name
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'SALES'
        and p.is_active
    )
  );

create policy misa_report119_customers_select_own
  on public.misa_report119_customers for select to authenticated
  using (
    exists (
      select 1
      from public.misa_report119_employees e
      join public.profiles p
        on p.amis_employee_name = e.employee_name
      where e.period_month = misa_report119_customers.period_month
        and e.misa_employee_id = misa_report119_customers.misa_employee_id
        and p.id = (select auth.uid())
        and p.role = 'SALES'
        and p.is_active
    )
  );

create index if not exists misa_report119_employees_name_idx
  on public.misa_report119_employees (period_month, employee_name);
