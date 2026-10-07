-- Nối hồ sơ BikeForce của Võ Thanh Nhâm với đúng nhân viên AMIS đã được xác nhận.
-- Fail an toàn nếu hồ sơ không duy nhất hoặc đã được ánh xạ sang một người khác.
do $$
declare
  target_count integer;
begin
  select count(*)
    into target_count
  from public.profiles
  where role = 'SALES'
    and btrim(full_name) = 'Võ Thanh Nhâm';

  if target_count <> 1 then
    raise exception 'Expected exactly one SALES profile named Võ Thanh Nhâm, found %', target_count;
  end if;

  if exists (
    select 1
    from public.profiles
    where amis_employee_name = 'Võ Thanh Nhâm'
      and not (role = 'SALES' and btrim(full_name) = 'Võ Thanh Nhâm')
  ) then
    raise exception 'AMIS employee Võ Thanh Nhâm is already mapped to another profile';
  end if;

  update public.profiles
  set amis_employee_name = 'Võ Thanh Nhâm'
  where role = 'SALES'
    and btrim(full_name) = 'Võ Thanh Nhâm'
    and (amis_employee_name is null or amis_employee_name = 'Võ Thanh Nhâm');

  if not found then
    raise exception 'Profile Võ Thanh Nhâm is mapped to a different AMIS employee';
  end if;
end;
$$;
