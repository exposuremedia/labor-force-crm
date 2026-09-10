-- Allow anonymous inserts into crm_contacts. Safe because the public-facing
-- writer (the /api/leads/intake webhook endpoint) gates its own caller with
-- a shared-secret Bearer token (LEAD_INTAKE_TOKEN).
-- SELECT, UPDATE, DELETE remain restricted to authenticated staff users.

drop policy if exists "crm_contacts: anon insert" on crm_contacts;
create policy "crm_contacts: anon insert" on crm_contacts
  for insert to anon with check (true);
