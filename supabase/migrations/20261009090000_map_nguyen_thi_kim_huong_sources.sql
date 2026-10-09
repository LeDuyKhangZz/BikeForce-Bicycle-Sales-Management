-- Nối hồ sơ BikeForce của Nguyễn Thị Kim Hương với MISA và CRM Report 70.
-- Nhân viên này không tham gia SaleWork nên không tạo ánh xạ SaleWork.
do $$
declare
  target_count integer;
begin
  select count(*)
    into target_count
  from public.profiles
  where role = 'SALES'
    and btrim(full_name) = 'Nguyễn Thị Kim Hương';

  if target_count <> 1 then
    raise exception 'Expected exactly one SALES profile named Nguyễn Thị Kim Hương, found %', target_count;
  end if;

  if exists (
    select 1
    from public.profiles
    where amis_employee_name = 'Nguyễn Thị Kim Hương'
      and not (role = 'SALES' and btrim(full_name) = 'Nguyễn Thị Kim Hương')
  ) then
    raise exception 'AMIS employee Nguyễn Thị Kim Hương is already mapped to another profile';
  end if;

  if exists (
    select 1
    from public.profiles
    where employee_code = 'CT-QL-003'
      and not (role = 'SALES' and btrim(full_name) = 'Nguyễn Thị Kim Hương')
  ) then
    raise exception 'CRM employee code CT-QL-003 is already mapped to another profile';
  end if;

  update public.profiles
  set
    amis_employee_name = 'Nguyễn Thị Kim Hương',
    employee_code = 'CT-QL-003'
  where role = 'SALES'
    and btrim(full_name) = 'Nguyễn Thị Kim Hương'
    and (amis_employee_name is null or amis_employee_name = 'Nguyễn Thị Kim Hương')
    and (employee_code is null or employee_code = 'CT-QL-003');

  if not found then
    raise exception 'Profile Nguyễn Thị Kim Hương is mapped to a different MISA employee or CRM code';
  end if;
end;
$$;
