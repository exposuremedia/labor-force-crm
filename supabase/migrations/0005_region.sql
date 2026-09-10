-- Region marker for CRM contacts.
-- 'NY' = exposuremedia.com (original) lead
-- 'SC' = exposuremedia.com/sc lead
-- Set once at intake from source_url path. Phone area-code fallback.

alter table crm_contacts
  add column if not exists region text;

create index if not exists crm_contacts_region_idx on crm_contacts(region);

-- One-time backfill for historical rows.
-- NY area codes: NYC + Long Island + Hudson Valley
-- SC area codes: full state
update crm_contacts
   set region = case
     when regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^1?(212|332|347|516|631|646|718|838|845|914|917|929|934)' then 'NY'
     when regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^1?(803|839|843|854|864)' then 'SC'
     when coalesce(source_url, '') ilike '%/sc%' then 'SC'
     when coalesce(source_url, '') ilike '%exposuremedia.com%' then 'NY'
     else null
   end
 where region is null;
