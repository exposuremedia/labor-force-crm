# Labor Force Link CRM — Engineering Handoff

**Written:** 2026-09-10
**Purpose:** Hand the exact current state of this system to another engineer/AI so work can continue without rediscovery.
**Status:** Live in production. Deployed, DNS + SSL working, lead intake verified end-to-end. One outstanding blocker: **the owner has never successfully signed in** (see §11).

Read §7 (Gotchas) before changing anything. Two of those bugs cost hours and will silently destroy data if reintroduced.

---

## 1. What this system is

A single-tenant CRM that captures **subcontractor crew applications** from the Labor Force Link marketing site and turns them into filterable, pipeline-tracked contact records.

Labor Force Link recruits subcontractor crews (screen enclosures, concrete, patio/paver, turf) in specific metro markets, in English and Spanish. Each trade × market × language combination has its own landing page with a 9-step application form. The CRM is where those applications land, get triaged, and move through a hiring funnel.

### Data flow

```
laborforcelink.com (static HTML on SiteGround, Apache)
  └─ 7 crew application pages, 9-step form each
       │
       ├─► Formspree (xeedgpnr)  ── email notification  [primary, gates success UI]
       ├─► Google Apps Script    ── row in a Google Sheet [legacy log]
       └─► POST /api/leads/intake ── THE CRM PATH
              │
              ├─► GoHighLevel (optional, env-gated) — creates Contact + Opportunity
              ├─► Supabase Postgres `crm_contacts` (INSERT, anon key)
              └─► ntfy.sh/em-leads-xk7 — push notification, fire-and-forget
                     │
                     ▼
        crm.laborforcelink.com (Next.js on Vercel)
          /            Contacts list + filters
          /pipeline    Kanban board
          /contacts/[id]  Detail + inline edit + notes
```

Note the ordering inside `submitCrew()` on the site: **Formspree is awaited and gates the success screen**; the CRM call happens after, inside `getClientIP().then(...)`, and is fire-and-forget. A CRM outage therefore never breaks the applicant's experience — but it also means a failed CRM write is silent. There is no retry queue.

---

## 2. Accounts, IDs, URLs

| Thing | Value |
|---|---|
| Repo | `github.com/exposuremedia/labor-force-crm` (public) |
| Branch | `main` |
| Host | Vercel, project `labor-force-crm`, team `exposuremedias-projects` (Pro) |
| Production URL | `https://crm.laborforcelink.com` |
| Vercel URL | `https://labor-force-crm.vercel.app` |
| Database | Supabase project `labor-force-crm`, ref **`szilvnayuffsqucqdrbt`**, org "Exposure Media", **Free plan** |
| Supabase URL | `https://szilvnayuffsqucqdrbt.supabase.co` |
| Marketing site | `laborforcelink.com`, static HTML on **SiteGround** |
| SiteGround site id | `Smdud1lYOExJQT09` |
| DNS | SiteGround nameservers (`ns1.siteground.net`, `ns2.siteground.net`) |
| CRM DNS record | `CNAME crm → 2a9d44efccf0eefa.vercel-dns-016.com` (SSL issued, Let's Encrypt) |
| Formspree form | `xeedgpnr` |
| Google Sheet webhook | `script.google.com/macros/s/AKfycbzxrahUPkPpSzmuEkbCMajbY8NrWRMtdlpwdTstA3W-pm3wPg9zudVA8g-MXobX2mvVIg/exec` |
| ntfy topic | `ntfy.sh/em-leads-xk7` (public topic — anyone who knows it can read lead names/phones) |
| Meta Pixel | dataset `4656522241339659` |
| Owner account | `grandtimepieces@gmail.com`, Supabase UID `00520dfd-a4f3-4fd3-80e1-56a9f21b271e` |

**Deploy method:** Vercel's GitHub integration. Push to `main` → auto-deploy. Note: the Vercel GitHub App is scoped to *select repositories*; if you add a new repo it must be granted at `github.com/settings/installations/125979715` or Vercel will claim the integration isn't installed.

---

## 3. Stack

```json
"next": "16.2.4",          // App Router
"react": "19.2.4",
"react-dom": "19.2.4",
"@supabase/ssr": "^0.10.2",
"@supabase/supabase-js": "^2.104.0",
"lucide-react": "^1.8.0",
"tailwindcss": "^4",       // via @tailwindcss/postcss
"typescript": "^5"
```

No test suite. No linter config beyond Next defaults. No CI. `next.config.ts` is empty.

Styling is **CSS custom properties in `app/globals.css`**, not Tailwind utility soup — Tailwind 4 is loaded but most components use hand-written token classes (`surface-card`, `btn-primary`, `em-input-square`). Brand tokens:

```
--color-brand:        #5F7A1F   (olive)
--color-brand-bright: #BAF703
--color-brand-deep:   #4B6118
--color-ink:          #1d1d1f
--font-display:       Montserrat
```
Lead-status colors (`--color-hot`, `--color-warm`, `--color-cold`, `--color-customer`, `--color-lost`) each have a `-soft` background pair. There is a dark theme (`[data-theme="dark"]` block, ~line 586) driven by `app/components/ThemeToggle.tsx`.

---

## 4. Repo layout

```
app/
  page.tsx                        Contacts list (server component, the main screen)
  layout.tsx, globals.css
  login/page.tsx                  Email+password sign-in
  set-password/page.tsx           Invite / recovery landing — sets session then password
  signout-button.tsx
  auth/confirm/route.ts           token_hash flow → verifyOtp
  auth/callback/route.ts          PKCE ?code= flow → exchangeCodeForSession
  pipeline/page.tsx
  pipeline/KanbanBoard.tsx        Drag-and-drop stage board
  contacts/[id]/page.tsx
  contacts/[id]/ContactEditor.tsx Inline edit + notes
  embed/contact/{page.tsx,EmbedForm.tsx}, embed/layout.tsx
  components/{Sidebar,MobileNav,ThemeToggle,AddOpportunityModal}.tsx
  api/
    leads/intake/route.ts         ★ PUBLIC. Website → CRM. 381 lines, the heart of it.
    contacts/[id]/route.ts        PATCH, auth required, ALLOWED_FIELDS whitelist
    notes/route.ts                POST note, auth required
    opportunities/create/route.ts Staff-created opportunity (no GHL, no ntfy)
    admin/sync-ghl-stages/route.ts  Pulls GHL pipelines/opportunities, maps stages back
lib/
  types.ts                        Contact, Note, LEAD_STATUSES, PIPELINE_STAGES
  trade.ts                        ★ trade/market/language derivation
  supabase/{client,server,middleware}.ts
middleware.ts                     Auth gate
supabase/migrations/0001..0006*.sql
.env.example
```

---

## 5. Data model

### `crm_contacts` — 59 columns, single table, no joins except notes

Built up across 6 migrations. `0001` is the original Exposure Media CRM schema; `0005` added a NY/SC `region` column that **`0006` superseded** — `region` still exists and still has backfilled values but nothing reads it. `0006` is the Labor Force Link migration and is the one that matters.

**Core:** `id uuid pk`, `first_name`, `last_name`, `email`, `phone`, `company`, `title`, `notes`, `lead_source`, `source_form`, `source_url`, `ghl_contact_id`, `owner_id → profiles(id)`, `raw_payload jsonb`, `created_at`, `updated_at`, `ghl_date_added`.

**Segmentation (0006):** `trade` (`SCREEN|CONCRETE|PATIO|TURF`), `market` (`"Sarasota, FL"`), `language` (`EN|ES`). Each indexed.

**Funnel:** `lead_status`, `pipeline_stage`, `opportunity_value numeric(12,2)`, `opportunity_source`, `tags text[]` (GIN indexed).

**Crew application fields (32, all `text`)** — grouped as the form steps are:
- business: `business_type`, `trades_offered`, `years_in_business`, `social_url`, `yard_location`
- insurance: `business_insurance`, `workers_comp`, `license_number`
- equipment: `pickup_trucks`, `dump_trucks`, `dump_trailers`, `skid_steer`, `hand_tools`, `vehicle_lettering`
- availability: `crews_managing`, `availability`, `start_timeline`, `min_crew_size`, `daily_start`, `daily_end`
- team/comms: `site_manager`, `first_language`, `second_language`, `fluent_english`, `crew_english`, `foreman`, `comm_preference`, `heard_from`
- how they work: `project_focus`, `warranty`, `price_per_sqft`, `install_process`
- compliance: `w9`, `checklists`

They are all `text` on purpose — the form posts free-ish strings ("Yes", "3-5 years", "Full time") and normalizing them was deferred. `raw_payload` always holds the untouched submission, so nothing is lost if you later want to re-parse.

### `crm_notes`
`id`, `contact_id → crm_contacts on delete cascade`, `body`, `author_id → profiles(id)`, `created_at`.

### `profiles`
`id`, `full_name`, `role`. **`role` is read in `app/page.tsx` but nothing gates on it.** Role-based scoping is unimplemented.

### Enums (app-layer only, DB stays `text`)
```ts
LEAD_STATUSES   = ["Hot","Warm","Cold","Customer","Lost"]
PIPELINE_STAGES = ["New Application","Reviewing","Phone Screen","Docs Requested",
                   "Approved","Active Crew","On Hold","Not a Fit"]
```
⚠️ Migration `0004`'s comment lists a *different, stale* set of stages (`New Lead | Contacted | Interested | ...`) left over from the Exposure Media version. `lib/types.ts` is authoritative; the SQL comment is wrong. Fix or delete it.

### RLS policies on `crm_contacts` (6 total)
- **anon:** INSERT only (×2 — `0002` created one, a duplicate was added later while debugging; harmless, could be cleaned up). **No anon SELECT.** This is load-bearing — see §7.1.
- **authenticated:** SELECT / INSERT / UPDATE / DELETE, all `using (true)`. Any signed-in user sees everything.

`crm_notes` has the same four authenticated policies. A `crm_contacts_updated_at` BEFORE UPDATE trigger touches `updated_at`.

---

## 6. The routing contract (`lib/trade.ts`)

This is the cleverest and most fragile part of the design, so understand it before touching the site or the intake route.

**Every landing page posts one `source` string** that encodes everything:
```
"sarasota-fl/screen-subcontractors"
"es/sarasota-fl/concrete-subcontractors"
"subcontractor"                          ← generic page, no trade/market
```

From that one string the intake route derives:

```ts
tradeFrom(...)     // /screen/→SCREEN  /concrete/→CONCRETE  /patio|paver/→PATIO  /turf/→TURF
languageFrom(...)  // /(^|\/)es(\/|$)/ → "ES", else "EN"
marketFrom(...)    // /([a-z]{3,}(?:-[a-z]+)*)-([a-z]{2})(?:\/|$)/i
                   // "sarasota-fl" → "Sarasota, FL"
```
Fallback order is `source` → `source_url` → the trades[] the crew ticked.

**Why it's built this way:** launching New York requires **zero code changes**. Publish `/new-york-ny/screen-subcontractors/`, and `marketFrom` yields `"New York, NY"`, the market filter chip appears on `/` the moment the first lead lands (markets are derived from the rows themselves, not a hardcoded list), and the trade/lang filters already work.

**Where it breaks:** `marketFrom`'s regex needs a `city-XX` shape. A single-word market with no state suffix, a three-letter state code, or a page path like `/tampa/` will silently yield `market = null`. `/subcontractor/` (the generic page) posts `source: 'subcontractor'` and so gets **no trade and no market** — those leads land unsegmented and only show under "All".

Add a new trade by appending to `TRADES` and `TRADE_PATTERNS` in `lib/trade.ts` and to the `Trade` union in `lib/types.ts`. Nothing else.

### Auto-tagging (in `app/api/leads/intake/route.ts`)
Origin tags first, then answer-derived flags:
```
trade:screen · market:sarasota-fl · lang:en · source:sarasota-fl/screen-subcontractors
insured · workers-comp · warranty · w9 · english-on-crew · sole-focus · full-time · starts-now
```
The `yes()` predicate is `/^(yes|s[ií])$/i` — it accepts the Spanish "Sí"/"Si". Everything else is a substring/regex test on the answer text, so **rewording a form option label silently breaks a tag.** If you change the site's option text, grep the tag block.

---

## 7. Gotchas — read this section

### 7.1 ★ Supabase RLS: `INSERT ... RETURNING` requires a SELECT policy

**This broke every single lead in production and returned a misleading error.**

The intake endpoint writes with the **anon** key, which has INSERT but deliberately no SELECT. The original code was:

```ts
const { data, error } = await client.from("crm_contacts")
  .insert({...}).select("id").single();   // ← RETURNING clause
```

`.select()` after `.insert()` compiles to `INSERT ... RETURNING id`, and Postgres evaluates the RETURNING against the **SELECT** policy. With no anon SELECT policy the whole statement is rejected with:

```
new row violates row-level security policy for table "crm_contacts"
```

That message points at the INSERT policy, which is fine. Adding more INSERT policies does nothing. Isolate it with:
```sql
begin; set local role anon;
  insert into crm_contacts (first_name) values ('t') returning id;  -- fails
  insert into crm_contacts (first_name) values ('t');               -- succeeds
rollback;
```

**The fix, which is the current code — do not undo it:**
```ts
// Generate the row id here instead of relying on INSERT ... RETURNING.
// The intake endpoint writes with the anon key, which has an INSERT policy
// but no SELECT policy — a RETURNING clause would be rejected by RLS.
const newId = crypto.randomUUID();
const { error } = await client.from("crm_contacts").insert({ id: newId, ... });
```
`newId` is then used for the ntfy deep link and the JSON response. **Any `.select()` chained onto an anon insert anywhere will reproduce this.** The alternative fix is to set `SUPABASE_SERVICE_ROLE_KEY` and use `createServiceClient()` — which is the better long-term answer (§9).

### 7.2 ★ The site's CSP silently blocks new hosts

`.htaccess` on SiteGround sets a Content-Security-Policy. `connect-src` is an allowlist, and a blocked `fetch()` fails in the console with no user-visible symptom — the form still shows "success" because Formspree already resolved.

Current value:
```
connect-src 'self' https://crm.laborforcelink.com https://formspree.io
            https://script.google.com https://api.ipify.org
            https://www.facebook.com https://connect.facebook.net;
```
**If you point the forms at a new endpoint (a staging CRM, a different domain), add it here first or leads vanish with no error.**

### 7.3 ★ `createClient()` at module/render scope breaks the build

`next build` prerenders `/set-password`. An earlier version did `useMemo(() => createClient(), [])`, which ran during SSR where `NEXT_PUBLIC_*` weren't available, and the build failed on that route. Create the browser client **inside `useEffect` and inside event handlers** — `@supabase/ssr`'s `createBrowserClient` is a per-browser singleton, so calling it repeatedly is free.

### 7.4 Auth links: two flows, both handled

Supabase emails arrive as either an implicit **hash fragment** (`#access_token=...&refresh_token=...`) or **PKCE** (`?code=...`). `/set-password` handles both on mount: read the hash → `setSession()` → `history.replaceState` to strip the token from the URL; else read `?code` → `exchangeCodeForSession()`. Then `getSession()` decides phase (`checking | ready | no-session`).

The earlier "**Auth session missing!**" bug was because the page only built a client inside `save()`, so the token in the URL was never consumed.

`/auth/confirm` (token_hash → `verifyOtp`) and `/auth/callback` (`?code` → exchange) exist as server-side alternatives but **are not currently reachable from the emails** — see §7.5.

### 7.5 Email templates are locked on the Free plan

Supabase shows "Set up custom SMTP to edit templates", so the invite email cannot be pointed at `/auth/confirm`. The workaround was to set **Site URL directly to `https://crm.laborforcelink.com/set-password`** so the default template's `{{ .SiteURL }}` lands on the right page.

**Consequence: Site URL is load-bearing for auth. If someone changes it to `/` or back to localhost, every auth email dead-ends.** (It *was* `http://localhost:3000` and that is exactly what happened.)
Redirect allowlist: `https://crm.laborforcelink.com/**`.

Also: Supabase default SMTP sends from a shared domain and is heavily rate-limited and spam-filtered. Set up Resend (or any SMTP) on `laborforcelink.com` and this whole class of problem goes away, plus templates unlock.

### 7.6 `/subcontractor/` produces unsegmented leads
Posts `source: 'subcontractor'` → `trade = null`, `market = null`. Either give it its own trade/market, or accept that those leads only appear under "All".

### 7.7 Middleware public prefixes
```ts
const PUBLIC_PREFIXES = ["/login", "/auth", "/set-password", "/embed", "/api/leads"];
```
Anything not prefixed here redirects unauthenticated users to `/login`. A new public route (a status page, a second intake endpoint) **must** be added or it will 302 and break.

---

## 8. Environment variables

`.env.example` in the repo root documents these.

| Var | Set in Vercel? | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Production + Preview | everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Production + Preview | everything |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **not set** | `createServiceClient()` — defined in `lib/supabase/server.ts`, **never called** |
| `LEAD_INTAKE_TOKEN` | ❌ not set | intake auth — **see below** |
| `GHL_PIT` | ❌ not set | GoHighLevel forwarding |
| `GHL_LOCATION_ID` | ❌ not set | GoHighLevel forwarding |
| `GHL_PIPELINE_ID` | ❌ not set | GHL opportunity creation |
| `GHL_PIPELINE_STAGE_NEW_LEAD` | ❌ not set | GHL opportunity creation |

**With GHL vars unset, `forwardToGhl()` returns early and the CRM works standalone.** That's the current state — GHL integration is dormant code, not active.

### ⚠️ `/api/leads/intake` is currently unauthenticated
The guard is:
```ts
if (expectedToken && provided && provided !== expectedToken) return 401;
```
`LEAD_INTAKE_TOKEN` is unset, so `expectedToken` is undefined and the check never fires. Combined with `Access-Control-Allow-Origin: *`, **anyone on the internet can POST arbitrary rows into `crm_contacts`.** This was fine while proving the pipeline out; it should not stay this way. Note the logic is also wrong even when the token *is* set — a request with **no** token passes, because `provided` is falsy. Correct it to:
```ts
if (expectedToken && provided !== expectedToken) return 401;
```
…and put the token in the site's `sendToCrm()` as a query param, or (better) replace token auth with an origin allowlist since the caller is browser JS and can't hold a real secret.

---

## 9. Known issues & recommended next work

Roughly in order of value.

1. **Nothing is authenticated on intake** (§8). Highest-risk item. Origin allowlist + rate limit.
2. **Set `SUPABASE_SERVICE_ROLE_KEY`** and switch the intake route to `createServiceClient()`. Removes the anon INSERT policies, removes the RETURNING footgun permanently, and lets intake read back the row.
3. **Role-based scoping is unimplemented.** `profiles.role` is fetched and displayed but gates nothing. The concrete ask on the table: a partner (e.g. a patio-trade principal) should see only `trade = 'PATIO'` leads. Needs RLS policies keyed on `profiles.role`/`profiles.trade` rather than `using (true)`, plus server-side filtering.
4. **The photo upload step is dead.** The 9-step form collects a photo at step 8/9 and then discards it — the JSON payload can't carry a file. Either wire it to Supabase Storage (signed upload URL from a new endpoint) or remove the step so applicants aren't asked for something that's thrown away.
5. **No retry / dead-letter on intake.** `sendToCrm` is fire-and-forget with `.catch(()=>{})`. A 500 loses the lead silently from the CRM's perspective (Formspree + the Sheet still have it, so it's recoverable manually, but nobody would know to look). Cheapest fix: log failures to the Google Sheet with a flag.
6. **The Google Apps Script is out of date** — the form gained ~10 columns that the Sheet doesn't have. Update the script's header mapping.
7. **`region` column and migration `0005` are dead** (superseded by `0006`'s trade/market/language). Drop it once you're sure nothing external reads it.
8. **Migration `0004`'s stage-name comment is stale** and contradicts `lib/types.ts`.
9. **Duplicate anon INSERT policy** on `crm_contacts` — a debugging leftover. Harmless, worth removing.
10. **No tests, no CI.** The intake route in particular (field mapping, trade derivation, tagging) is pure functions over JSON and is trivially unit-testable. `lib/trade.ts` especially.
11. **ntfy topic is public.** `em-leads-xk7` is guessable-ish and carries applicant names and phone numbers. Move to an authenticated push channel.
12. **List query is `.limit(500)`** with no pagination, and the market-chip query pulls `.limit(5000)` rows just to `distinct` them client-side. Fine at current volume; will need a view or an RPC as it grows.
13. **Housekeeping on the SiteGround server:** leftover `lfl-deploy-flat/`, `lfl-deploy-v3/` directories and their `.zip`s in `public_html` should be removed.
14. **Two GitHub personal access tokens (`ghp_...`) are sitting in plaintext on the owner's Mac.** They were found but deliberately not used. They should be revoked at `github.com/settings/tokens`.

---

## 10. The marketing site side

Static HTML, deployed on SiteGround. Working copy of the tree lives on the owner's Mac; the live copy is edited through **SiteGround File Manager's Monaco editor** (no CLI, no git on that host). The CRM wiring was applied via Monaco's regex find/replace, one page at a time.

**7 pages are wired**, each posting a distinct `source`:

| Page | `source` | → trade / market / lang |
|---|---|---|
| `/subcontractor/` | `subcontractor` | — / — / EN |
| `/sarasota-fl/screen-subcontractors/` | `sarasota-fl/screen-subcontractors` | SCREEN / Sarasota, FL / EN |
| `/sarasota-fl/concrete-subcontractors/` | `sarasota-fl/concrete-subcontractors` | CONCRETE / Sarasota, FL / EN |
| `/sarasota-fl/patio-subcontractors/` | `sarasota-fl/patio-subcontractors` | PATIO / Sarasota, FL / EN |
| `/es/sarasota-fl/screen-subcontractors/` | `es/sarasota-fl/screen-subcontractors` | SCREEN / Sarasota, FL / ES |
| `/es/sarasota-fl/concrete-subcontractors/` | `es/sarasota-fl/concrete-subcontractors` | CONCRETE / Sarasota, FL / ES |
| `/es/sarasota-fl/patio-subcontractors/` | `es/sarasota-fl/patio-subcontractors` | PATIO / Sarasota, FL / ES |

The injected snippet, identical on all 7:

```js
const CRM_INTAKE_URL='https://crm.laborforcelink.com/api/leads/intake';
function sendToCrm(data){
  try{
    fetch(CRM_INTAKE_URL,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...data,source_url:location.href}),keepalive:true}).catch(()=>{});
  }catch(e){}
}
```
called from the success branch of `submitCrew()`:
```js
getClientIP().then(ip=>{const rec={...data,ip,source:'<page source>'};logToSheet(rec);sendToCrm(rec);});
```

**Spanish pages post English values.** The option buttons carry `data-val` in English, so `business_insurance` is `"Yes"` not `"Sí"` — only the visible label is translated. The `yes()` predicate accepts both anyway. Don't "fix" the Spanish pages to post Spanish values; it would break tagging and filtering.

Form field name → DB column mapping is the `crew` object in `app/api/leads/intake/route.ts` (~line 265). A few names differ between the form and the column: `years → years_in_business`, `social → social_url`, `license → license_number`, `trades → trades_offered`.

---

## 11. Current blocker: nobody can sign in

There is exactly **one** auth user: `grandtimepieces@gmail.com` (UID `00520dfd-a4f3-4fd3-80e1-56a9f21b271e`), invited 2026-09-10 19:11:35 UTC. It is **unconfirmed and has never signed in.** The invite/recovery emails from Supabase's default shared SMTP have not been reliably arriving.

The app-side flow is fixed and correct (§7.4) — this is purely email deliverability. Three ways out, best first:

1. **Set up SMTP** (Resend on `laborforcelink.com`, ~15 min). Fixes delivery permanently and unlocks email templates so `/auth/confirm` can be used properly.
2. **Supabase Dashboard → Authentication → Users → Add user**, with "Auto Confirm User" checked. Sets a password directly, no email involved.
3. **Send another recovery link** from the dashboard and check spam.

Once someone can sign in, the remaining verification is: the list at `/` renders, filters work, `/pipeline` drags between stages, and `/contacts/[id]` saves an edit and a note.

### What *has* been verified end-to-end
A test lead was POSTed to `/api/leads/intake` and returned **200** with id `e8c83ff2-a948-47a4-a324-8c9fd99a939c`. SQL confirmed the row landed with `trade=SCREEN`, `market="Sarasota, FL"`, `language=EN`, `lead_source="sarasota-fl/screen-subcontractors"`, `pipeline_stage="New Application"`, and the expected `tags[]`. The row was then deleted. **`crm_contacts` is currently empty** — the partner demo will need seed data.

---

## 12. Local development

```bash
git clone https://github.com/exposuremedia/labor-force-crm
cd labor-force-crm
npm install
cp .env.example .env.local     # fill in from Supabase → Settings → API (legacy anon key)
npm run dev
```

`http://localhost:3000` will redirect to `/login`. To sign in locally you need a confirmed user (§11) — and note that Supabase's **Site URL is production**, so auth emails triggered from localhost will still send you to `crm.laborforcelink.com`. Add `http://localhost:3000/**` to the redirect allowlist if you need local auth links.

`npm run build` must pass before pushing; Vercel deploys `main` automatically and a broken build takes production down.

Migrations are applied by hand in the **Supabase SQL Editor** — there is no `supabase` CLI link and no migration runner. Numbered files in `supabase/migrations/` are the record of what was run, in order. Keep adding to them if you change schema.
