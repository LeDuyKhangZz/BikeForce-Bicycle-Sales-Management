-- DEC-005: service_role chỉ dùng auth.admin.*, không có DML hoặc TRUNCATE trên dữ liệu nghiệp vụ.
revoke all on table public.sales_monthly_travel_expenses from service_role;
