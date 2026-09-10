-- CRM contacts table for home.exposuremedia.com
-- Run this in the Supabase SQL Editor for project nrezlwdxnrlxfdnevaai.

create table if not exists crm_contacts (
  id uuid default gen_random_uuid() primary key,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  title text,
  notes text,
  lead_source text,
  source_form text,
  source_url text,
  ghl_contact_id text,
  owner_id uuid references profiles(id),
  raw_payload jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists crm_contacts_email_idx on crm_contacts(email);
create index if not exists crm_contacts_created_at_idx on crm_contacts(created_at desc);
create index if not exists crm_contacts_source_form_idx on crm_contacts(source_form);

alter table crm_contacts enable row level security;

-- Authenticated staff users can read/write. Webhook intake uses service-role
-- and bypasses RLS.
drop policy if exists "crm_contacts: authenticated read" on crm_contacts;
create policy "crm_contacts: authenticated read" on crm_contacts
  for select to authenticated using (true);

drop policy if exists "crm_contacts: authenticated insert" on crm_contacts;
create policy "crm_contacts: authenticated insert" on crm_contacts
  for insert to authenticated with check (true);

drop policy if exists "crm_contacts: authenticated update" on crm_contacts;
create policy "crm_contacts: authenticated update" on crm_contacts
  for update to authenticated using (true) with check (true);

drop policy if exists "crm_contacts: authenticated delete" on crm_contacts;
create policy "crm_contacts: authenticated delete" on crm_contacts
  for delete to authenticated using (true);

-- Touch updated_at on any row change.
create or replace function crm_contacts_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists crm_contacts_updated_at on crm_contacts;
create trigger crm_contacts_updated_at
  before update on crm_contacts
  for each row execute function crm_contacts_set_updated_at();
