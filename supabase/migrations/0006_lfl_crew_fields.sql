-- ─────────────────────────────────────────────────────────────────────
-- Labor Force Link — crew application fields
--
-- Replaces the Exposure Media region model (NY/SC) with the crew model:
-- trade, market and language, plus every field the 9-step crew
-- application collects. raw_payload still holds the untouched submission.
-- ─────────────────────────────────────────────────────────────────────

-- ── routing / segmentation ───────────────────────────────────────────
alter table crm_contacts
  add column if not exists trade         text,   -- SCREEN | CONCRETE | PATIO | TURF
  add column if not exists market        text,   -- "Sarasota, FL"
  add column if not exists language      text;   -- EN | ES

create index if not exists crm_contacts_trade_idx    on crm_contacts(trade);
create index if not exists crm_contacts_market_idx   on crm_contacts(market);
create index if not exists crm_contacts_language_idx on crm_contacts(language);

-- ── step 1-2: business ───────────────────────────────────────────────
alter table crm_contacts
  add column if not exists business_type      text,
  add column if not exists trades_offered     text,
  add column if not exists years_in_business  text,
  add column if not exists social_url         text,
  add column if not exists yard_location      text;

-- ── step 3: insurance & licensing ────────────────────────────────────
alter table crm_contacts
  add column if not exists business_insurance text,
  add column if not exists workers_comp       text,
  add column if not exists license_number     text;

-- ── step 4: equipment ────────────────────────────────────────────────
alter table crm_contacts
  add column if not exists pickup_trucks     text,
  add column if not exists dump_trucks       text,
  add column if not exists dump_trailers     text,
  add column if not exists skid_steer        text,
  add column if not exists hand_tools        text,
  add column if not exists vehicle_lettering text;

-- ── step 5: availability ─────────────────────────────────────────────
alter table crm_contacts
  add column if not exists crews_managing  text,
  add column if not exists availability    text,
  add column if not exists start_timeline  text,
  add column if not exists min_crew_size   text,
  add column if not exists daily_start     text,
  add column if not exists daily_end       text;

-- ── step 6: team & comms ─────────────────────────────────────────────
alter table crm_contacts
  add column if not exists site_manager    text,
  add column if not exists first_language  text,
  add column if not exists second_language text,
  add column if not exists fluent_english  text,
  add column if not exists crew_english    text,
  add column if not exists foreman         text,
  add column if not exists comm_preference text,
  add column if not exists heard_from      text;

-- ── step 7: how they work ────────────────────────────────────────────
alter table crm_contacts
  add column if not exists project_focus   text,
  add column if not exists warranty        text,
  add column if not exists price_per_sqft  text,
  add column if not exists install_process text;

-- ── step 8: compliance ───────────────────────────────────────────────
alter table crm_contacts
  add column if not exists w9         text,
  add column if not exists checklists text;

-- ── backfill trade/market/language from existing source strings ──────
update crm_contacts
   set trade = case
         when coalesce(source_form, source_url, '') ~* 'screen'        then 'SCREEN'
         when coalesce(source_form, source_url, '') ~* 'concrete'      then 'CONCRETE'
         when coalesce(source_form, source_url, '') ~* 'patio|paver'   then 'PATIO'
         when coalesce(source_form, source_url, '') ~* 'turf'          then 'TURF'
         else trade
       end,
       language = case
         when coalesce(source_form, source_url, '') ~* '(^|/)es(/|$)' then 'ES'
         else coalesce(language, 'EN')
       end
 where trade is null or language is null;
