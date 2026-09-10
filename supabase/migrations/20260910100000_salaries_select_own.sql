-- BR-030: Sales chỉ được đọc lương của chính mình để dựng ảnh báo cáo.
drop policy monthly_salaries_select_admin
  on public.sales_monthly_salaries;

create policy monthly_salaries_select_own_or_admin
  on public.sales_monthly_salaries
  for select
  to authenticated
  using (
    sales_id = (select auth.uid())
    or (select public.is_admin())
  );
