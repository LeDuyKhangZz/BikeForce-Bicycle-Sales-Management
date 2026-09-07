-- BR-028: ảnh báo cáo của Sales cần đọc công tác phí tháng trước của chính người đó.
drop policy monthly_travel_expenses_select_admin
  on public.sales_monthly_travel_expenses;

create policy monthly_travel_expenses_select_own_or_admin
  on public.sales_monthly_travel_expenses
  for select
  to authenticated
  using (
    sales_id = (select auth.uid())
    or (select public.is_admin())
  );
