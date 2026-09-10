# Labor Force Link — CRM

Next.js 16 + Supabase. Cloned from exposure-media-crm and rebranded.

## What changed from the Exposure Media original

| Exposure Media | Labor Force Link |
|---|---|
| Purple `#7B6DC8` | Lime `#BAF703` fills, deep-olive `#5F7A1F` accent text, black sidebar |
| Region `NY` / `SC` | `trade` (SCREEN/CONCRETE/PATIO/TURF) + `market` + `language` |
| Pipeline: New Lead → Closed Won | New Application → Reviewing → Phone Screen → Docs Requested → Approved → Active Crew → On Hold → Not a Fit |
| — | 37 new columns: every answer from the 9-step crew application |
| — | Auto-tagging on intake |
| — | Trade / Language / Location / Tag filter tabs |
| — | "Crew Application" panel on the contact record |

## Setup (in order)

1. **Supabase** — create a project, then run these in the SQL Editor in order:
   - `supabase/migrations/0001_crm_contacts.sql`
   - `0002_crm_contacts_anon_insert.sql`
   - `0003_crm_extensions.sql`
   - `0004_pipeline_stages.sql`
   - `0005_region.sql`  ← safe to skip; superseded by 0006
   - `0006_lfl_crew_fields.sql`  ← the crew schema
2. **Env** — copy `.env.example` to `.env.local`, fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`   (intake route uses this; bypasses RLS)
   GHL vars are optional — leave blank and GHL forwarding is skipped.
3. **Vercel** — import the repo, add the same env vars, add the domain
   `crm.laborforcelink.com`.
4. **Point the site forms at intake** — in each of the 7 crew forms, after the
   Formspree POST succeeds, also POST the same JSON to:
   `https://crm.laborforcelink.com/api/leads/intake`
   The route already understands every field name the forms send.

## Location tabs are self-extending

Markets are read from the `market` column at request time, so when you launch
New York the tab appears on its own the first time a NY lead lands. No deploy.
`marketFrom()` in `lib/trade.ts` parses any `city-ST` slug.

## Auto-tags applied at intake

Origin: `trade:screen`, `market:sarasota-fl`, `lang:es`, `source:<page path>`
Answers: `insured`, `workers-comp`, `warranty`, `w9`, `english-on-crew`,
`sole-focus`, `full-time`, `starts-now`
