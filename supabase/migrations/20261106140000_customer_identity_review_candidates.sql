-- Show every unlinked SaleWork/Zalo customer that is not an exact approved candidate.
-- Suggestions are review-only; the approval RPC continues to require an exact phone match.
create or replace function public.list_customer_identity_review(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  source_customer_id uuid,
  source_id text,
  source_name text,
  source_code text,
  phone_raw text,
  normalized_phone text,
  review_reason text,
  suggested_misa jsonb,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce((select public.is_admin()), false) is not true then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid page range';
  end if;

  return query
  with base_rows as (
    select
      s.id as source_customer_id,
      s.source_id,
      s.customer_name as source_name,
      s.customer_code as source_code,
      coalesce(s.phone_raw, s.phone) as phone_raw,
      s.normalized_phone,
      case
        when s.normalized_phone is null then 'missing_or_invalid_phone'
        when exists (
          select 1 from public.customers m
          where m.source_system = 'MISA'
            and m.normalized_phone = s.normalized_phone
        ) then 'exact_phone_but_no_eligible_misa_code'
        else 'no_exact_phone_match'
      end as review_reason,
      count(*) over () as total_count
    from public.customers s
    left join public.customer_identity_links l on l.source_customer_id = s.id
    where s.source_system = 'SALEWORK_ZALO'
      and l.source_customer_id is null
      and not exists (
        select 1
        from public.customers m
        where m.source_system = 'MISA'
          and m.normalized_phone = s.normalized_phone
          and nullif(btrim(m.customer_code), '') is not null
      )
  ), page_rows as (
    select * from base_rows
    order by source_name, source_customer_id
    limit p_limit offset p_offset
  )
  select
    page_rows.source_customer_id,
    page_rows.source_id,
    page_rows.source_name,
    page_rows.source_code,
    page_rows.phone_raw,
    page_rows.normalized_phone,
    page_rows.review_reason,
    coalesce(matches.suggested_misa, '[]'::jsonb),
    page_rows.total_count
  from page_rows
  left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'id', candidates.id,
          'customer_code', candidates.customer_code,
          'customer_name', candidates.customer_name,
          'normalized_phone', candidates.normalized_phone,
          'match_reason', candidates.match_reason
        ) order by candidates.priority, candidates.customer_name, candidates.id
      ) as suggested_misa
      from (
        select m.id, m.customer_code, m.customer_name, m.normalized_phone,
          case
            when page_rows.normalized_phone is not null and m.normalized_phone = page_rows.normalized_phone
              then 'same_phone_but_misa_code_missing'
            when page_rows.normalized_phone is not null
              and right(m.normalized_phone, 7) = right(page_rows.normalized_phone, 7)
              then 'same_last_7_phone_digits_review_manually'
            else 'same_normalized_name_review_manually'
          end as match_reason,
          case
            when page_rows.normalized_phone is not null and m.normalized_phone = page_rows.normalized_phone then 1
            when page_rows.normalized_phone is not null
              and right(m.normalized_phone, 7) = right(page_rows.normalized_phone, 7) then 2
            else 3
          end as priority
        from public.customers m
        where m.source_system = 'MISA'
          and (
            (page_rows.normalized_phone is not null and m.normalized_phone = page_rows.normalized_phone)
            or (
              nullif(btrim(m.customer_code), '') is not null
              and page_rows.normalized_phone is not null
              and char_length(page_rows.normalized_phone) >= 9
              and m.normalized_phone is not null
              and char_length(m.normalized_phone) >= 9
              and right(m.normalized_phone, 7) = right(page_rows.normalized_phone, 7)
            )
            or (
              nullif(btrim(m.customer_code), '') is not null
              and
              (
                nullif(regexp_replace(btrim(m.customer_name), '[^[:alnum:]]', '', 'g'), '') is not null
                and lower(regexp_replace(btrim(m.customer_name), '[^[:alnum:]]', '', 'g')) =
                  lower(regexp_replace(btrim(page_rows.source_name), '[^[:alnum:]]', '', 'g'))
              )
            )
          )
        order by priority, m.customer_name, m.id
        limit 3
      ) candidates
    ) matches on true;
end;
$$;

revoke all on function public.list_customer_identity_review(integer, integer) from public, anon, service_role;
grant execute on function public.list_customer_identity_review(integer, integer) to authenticated;

comment on function public.list_customer_identity_review(integer, integer) is
  'Admin-only paginated list of unlinked SaleWork/Zalo customers without an eligible exact-phone MISA match. Last-seven-digit and normalized-name suggestions are review-only; approvals still require exact phone equality.';
