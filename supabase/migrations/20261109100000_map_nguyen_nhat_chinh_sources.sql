-- Nối hồ sơ BikeForce của Nguyễn Nhật Chỉnh với đúng nguồn AMIS CRM và mã CRM.
-- SaleWork dùng chính tên "Nguyễn Nhật Chỉnh"; ánh xạ đó nằm ở lib/salework/sales-account-map.ts.
do $$
declare
  target_count integer;
begin
  select count(*)
    into target_count
  from public.profiles
  where role = 'SALES'
    and btrim(full_name) = 'Nguyễn Nhật Chỉnh';

  if target_count <> 1 then
    raise exception 'Expected exactly one SALES profile named Nguyễn Nhật Chỉnh, found %', target_count;
  end if;

  if exists (
    select 1
    from public.profiles
    where amis_employee_name = 'Nguyễn Nhật Chỉnh'
      and not (role = 'SALES' and btrim(full_name) = 'Nguyễn Nhật Chỉnh')
  ) then
    raise exception 'AMIS employee Nguyễn Nhật Chỉnh is already mapped to another profile';
  end if;

  if exists (
    select 1
    from public.profiles
    where employee_code = 'KD-MT4-003'
      and not (role = 'SALES' and btrim(full_name) = 'Nguyễn Nhật Chỉnh')
  ) then
    raise exception 'CRM employee code KD-MT4-003 is already mapped to another profile';
  end if;

  update public.profiles
  set
    amis_employee_name = 'Nguyễn Nhật Chỉnh',
    employee_code = 'KD-MT4-003'
  where role = 'SALES'
    and btrim(full_name) = 'Nguyễn Nhật Chỉnh'
    and (amis_employee_name is null or amis_employee_name = 'Nguyễn Nhật Chỉnh')
    and (employee_code is null or employee_code = 'KD-MT4-003');

  if not found then
    raise exception 'Profile Nguyễn Nhật Chỉnh is mapped to a different AMIS employee or CRM code';
  end if;
end;
$$;
