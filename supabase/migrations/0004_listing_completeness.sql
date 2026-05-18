-- 0004: round out listing schema for public launch
-- - duplicate_status: AI's verdict (unique / possible_duplicate / duplicate)
-- - cta_primary / cta_secondary already exist as primary_cta / secondary_cta
-- - signal_type already exists, just needs to be populated by enrichment

alter table listings
  add column if not exists duplicate_status text
    check (duplicate_status in ('unique','possible_duplicate','duplicate'))
    default 'unique';

-- Featured listing helper: top 3 priority per category, refreshed each enrich run
create or replace function refresh_featured()
returns int language plpgsql as $$
declare
  affected int := 0;
begin
  -- Clear previous featured
  update listings set featured = false where featured = true;

  -- Mark top-3 by priority per category in published, non-stale rows
  with ranked as (
    select id,
           row_number() over (
             partition by category
             order by priority_score desc nulls last, published_at desc nulls last
           ) as rn
    from listings
    where status = 'published'
      and (expiry_date is null or expiry_date >= current_date)
      and priority_score is not null
  )
  update listings l
     set featured = true
    from ranked r
   where l.id = r.id
     and r.rn <= 3;

  get diagnostics affected = row_count;
  return affected;
end $$;
