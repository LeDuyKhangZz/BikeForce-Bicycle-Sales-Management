-- Thu hồi phiếu chăm sóc đã duyệt, giữ nguyên lần duyệt và ảnh để truy vết.
alter table public.customer_care_submissions
  add column revoked_by uuid references public.profiles(id),
  add column revoked_at timestamptz,
  add column revocation_reason text;

alter table public.customer_care_submissions
  add constraint customer_care_revocation_reason_length
    check (revocation_reason is null or char_length(revocation_reason) <= 1000);

alter table public.customer_care_submissions
  drop constraint customer_care_review_state_valid;

alter table public.customer_care_submissions
  add constraint customer_care_review_state_valid check (
    (status = 'PENDING' and reviewed_by is null and reviewed_at is null and rejection_reason is null
      and revoked_by is null and revoked_at is null and revocation_reason is null)
    or (status = 'APPROVED' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null
      and revoked_by is null and revoked_at is null and revocation_reason is null)
    or (status = 'REJECTED' and reviewed_by is not null and reviewed_at is not null
      and btrim(coalesce(rejection_reason, '')) <> ''
      and revoked_by is null and revoked_at is null and revocation_reason is null)
    or (status = 'REVOKED' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null
      and revoked_by is not null and revoked_at is not null
      and btrim(coalesce(revocation_reason, '')) <> '')
  );

create or replace function public.guard_customer_care_review_transition()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if old.status = 'PENDING' and new.status in ('APPROVED', 'REJECTED')
    and new.revoked_by is null and new.revoked_at is null and new.revocation_reason is null then
    return new;
  end if;
  if old.status = 'APPROVED' and new.status = 'REVOKED'
    and new.reviewed_by is not distinct from old.reviewed_by
    and new.reviewed_at is not distinct from old.reviewed_at
    and new.rejection_reason is not distinct from old.rejection_reason then
    return new;
  end if;
  raise exception 'Invalid customer care review transition';
end;
$$;

create trigger trg_customer_care_review_transition
  before update on public.customer_care_submissions
  for each row execute function public.guard_customer_care_review_transition();

grant update (revoked_by, revoked_at, revocation_reason) on public.customer_care_submissions to authenticated;

drop policy customer_care_submissions_update_admin on public.customer_care_submissions;
create policy customer_care_submissions_update_admin on public.customer_care_submissions
  for update to authenticated
  using ((select public.is_admin()) and status in ('PENDING', 'APPROVED'))
  with check ((select public.is_admin()) and (
    (status in ('APPROVED', 'REJECTED') and reviewed_by = (select auth.uid()) and reviewed_at is not null)
    or (status = 'REVOKED' and revoked_by = (select auth.uid()) and revoked_at is not null
      and btrim(coalesce(revocation_reason, '')) <> '')
  ));
