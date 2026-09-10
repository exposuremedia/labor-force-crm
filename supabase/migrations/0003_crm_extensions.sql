-- CRM extensions: lead status, tags, owner, notes table
-- Apply via Supabase SQL Editor.

alter table crm_contacts
  add column if not exists lead_status text,
  add column if not exists tags text[] default '{}'::text[];

create index if not exists crm_contacts_lead_status_idx on crm_contacts(lead_status);
create index if not exists crm_contacts_tags_idx on crm_contacts using gin(tags);

create table if not exists crm_notes (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  body text not null,
  author_id uuid references profiles(id),
  created_at timestamp with time zone default now()
);

create index if not exists crm_notes_contact_id_idx on crm_notes(contact_id, created_at desc);

alter table crm_notes enable row level security;

drop policy if exists "crm_notes: authenticated read" on crm_notes;
create policy "crm_notes: authenticated read" on crm_notes
  for select to authenticated using (true);

drop policy if exists "crm_notes: authenticated insert" on crm_notes;
create policy "crm_notes: authenticated insert" on crm_notes
  for insert to authenticated with check (true);

drop policy if exists "crm_notes: authenticated update" on crm_notes;
create policy "crm_notes: authenticated update" on crm_notes
  for update to authenticated using (true) with check (true);

drop policy if exists "crm_notes: authenticated delete" on crm_notes;
create policy "crm_notes: authenticated delete" on crm_notes
  for delete to authenticated using (true);

grant select, insert, update, delete on crm_notes to authenticated;
