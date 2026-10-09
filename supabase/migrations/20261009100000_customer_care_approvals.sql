-- Sales gửi minh chứng chăm sóc; Admin duyệt; ảnh thật lưu Cloudinary.

create type public.customer_care_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create table public.customer_care_submissions (
  id uuid primary key default gen_random_uuid(),
  misa_customer_id bigint not null,
  period_month date not null,
  misa_employee_id bigint not null,
  customer_code text not null,
  customer_name text not null,
  submitted_by uuid not null references public.profiles(id),
  care_date date not null,
  note text,
  status public.customer_care_status not null default 'PENDING',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_care_period_first_day check (extract(day from period_month) = 1),
  constraint customer_care_customer_name_not_blank check (btrim(customer_name) <> ''),
  constraint customer_care_note_length check (note is null or char_length(note) <= 2000),
  constraint customer_care_rejection_reason_length check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  constraint customer_care_review_state_valid check (
    (status = 'PENDING' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
    or (status = 'APPROVED' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
    or (status = 'REJECTED' and reviewed_by is not null and reviewed_at is not null and btrim(coalesce(rejection_reason, '')) <> '')
  )
);

create table public.customer_care_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.customer_care_submissions(id) on delete cascade,
  cloudinary_asset_id text not null,
  cloudinary_public_id text not null,
  secure_url text not null,
  resource_type text not null default 'image',
  delivery_type text not null default 'authenticated',
  format text not null,
  bytes integer not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint customer_care_evidence_asset_unique unique (cloudinary_asset_id),
  constraint customer_care_evidence_public_id_unique unique (cloudinary_public_id),
  constraint customer_care_evidence_public_id_not_blank check (btrim(cloudinary_public_id) <> ''),
  constraint customer_care_evidence_https check (secure_url like 'https://%'),
  constraint customer_care_evidence_image_only check (resource_type = 'image'),
  constraint customer_care_evidence_delivery check (delivery_type = 'authenticated'),
  constraint customer_care_evidence_size check (bytes > 0 and bytes <= 10485760),
  constraint customer_care_evidence_dimensions check ((width is null or width > 0) and (height is null or height > 0))
);

create index customer_care_submissions_pending_idx on public.customer_care_submissions (created_at) where status = 'PENDING';
create index customer_care_submissions_sales_idx on public.customer_care_submissions (submitted_by, created_at desc);
create index customer_care_submissions_customer_idx on public.customer_care_submissions (misa_customer_id, status, care_date desc);
create index customer_care_evidence_submission_idx on public.customer_care_evidence (submission_id, created_at);

create trigger trg_customer_care_submissions_set_updated_at
  before update on public.customer_care_submissions
  for each row execute function public.set_updated_at();

alter table public.customer_care_submissions enable row level security;
alter table public.customer_care_submissions force row level security;
alter table public.customer_care_evidence enable row level security;
alter table public.customer_care_evidence force row level security;

revoke all on public.customer_care_submissions from public, anon, authenticated, service_role;
revoke all on public.customer_care_evidence from public, anon, authenticated, service_role;
grant select, insert on public.customer_care_submissions to authenticated;
grant update (status, reviewed_by, reviewed_at, rejection_reason, updated_at) on public.customer_care_submissions to authenticated;
grant select, insert on public.customer_care_evidence to authenticated;

create policy customer_care_submissions_select on public.customer_care_submissions
  for select to authenticated
  using (submitted_by = (select auth.uid()) or (select public.is_admin()));

create policy customer_care_submissions_insert_own on public.customer_care_submissions
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid()) and status = 'PENDING'
    and reviewed_by is null and reviewed_at is null and rejection_reason is null
    and exists (
      select 1
      from public.misa_report119_customers customer
      join public.misa_report119_employees employee
        on employee.period_month = customer.period_month and employee.misa_employee_id = customer.misa_employee_id
      join public.profiles profile on profile.amis_employee_name = employee.employee_name
      where customer.period_month = customer_care_submissions.period_month
        and customer.misa_employee_id = customer_care_submissions.misa_employee_id
        and customer.misa_customer_id = customer_care_submissions.misa_customer_id
        and customer.customer_code = customer_care_submissions.customer_code
        and profile.id = (select auth.uid()) and profile.role = 'SALES' and profile.is_active
    )
  );

create policy customer_care_submissions_update_admin on public.customer_care_submissions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and status in ('APPROVED', 'REJECTED') and reviewed_by = (select auth.uid()) and reviewed_at is not null);

create policy customer_care_evidence_select on public.customer_care_evidence
  for select to authenticated
  using (exists (
    select 1 from public.customer_care_submissions submission
    where submission.id = customer_care_evidence.submission_id
      and (submission.submitted_by = (select auth.uid()) or (select public.is_admin()))
  ));

create policy customer_care_evidence_insert_own_pending on public.customer_care_evidence
  for insert to authenticated
  with check (exists (
    select 1 from public.customer_care_submissions submission
    where submission.id = customer_care_evidence.submission_id
      and submission.submitted_by = (select auth.uid()) and submission.status = 'PENDING'
  ));

create view public.customer_effective_care_dates with (security_invoker = true) as
select customer.period_month, customer.misa_employee_id, customer.misa_customer_id,
  customer.customer_code, customer.customer_name, customer.last_visit_date,
  approved.latest_approved_care_date,
  case
    when customer.last_visit_date is null then approved.latest_approved_care_date
    when approved.latest_approved_care_date is null then customer.last_visit_date
    else greatest(customer.last_visit_date, approved.latest_approved_care_date)
  end as effective_last_care_date
from public.misa_report119_customers customer
left join lateral (
  select max(submission.care_date) as latest_approved_care_date
  from public.customer_care_submissions submission
  where submission.misa_customer_id = customer.misa_customer_id and submission.status = 'APPROVED'
) approved on true;

grant select on public.customer_effective_care_dates to authenticated;
