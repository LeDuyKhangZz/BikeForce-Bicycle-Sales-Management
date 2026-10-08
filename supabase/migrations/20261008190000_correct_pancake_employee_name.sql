-- Sửa tên nhân viên Sàn TMĐT đã được người dùng xác nhận.

do $migration$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    'public.upsert_pancake_daily_report(date,bigint,integer,bigint,integer,integer,integer,integer,bigint,jsonb)'::regprocedure
  ) into function_definition;

  corrected_definition := replace(function_definition, 'Trần Minh Triết', 'Nguyễn Ngọc Triết');
  if corrected_definition = function_definition then
    raise exception 'Expected employee name was not found in upsert_pancake_daily_report';
  end if;

  execute corrected_definition;
end;
$migration$;

alter table public.pancake_daily_reports
  drop constraint pancake_daily_reports_employee;

update public.pancake_daily_reports
set employee_name = 'Nguyễn Ngọc Triết'
where employee_name = 'Trần Minh Triết';

alter table public.pancake_daily_reports
  alter column employee_name set default 'Nguyễn Ngọc Triết';

alter table public.pancake_daily_reports
  add constraint pancake_daily_reports_employee
  check (employee_name = 'Nguyễn Ngọc Triết');
