-- Admin quản lý kế hoạch; Sales chỉ được xem kế hoạch của chính mình.

drop policy if exists misa_customer_plans_insert_own on public.misa_customer_monthly_plans;
drop policy if exists misa_customer_plans_update_own on public.misa_customer_monthly_plans;

create policy misa_customer_plans_insert_admin
  on public.misa_customer_monthly_plans for insert to authenticated
  with check ((select public.is_admin()));

create policy misa_customer_plans_update_admin
  on public.misa_customer_monthly_plans for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
