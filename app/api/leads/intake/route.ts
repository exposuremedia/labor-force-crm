import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { tradeFrom, languageFrom, marketFrom } from "@/lib/trade";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GhlPayload = Record<string, unknown> & {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  company_name?: string;
  companyName?: string;
  title?: string;
  notes?: string;
  message?: string;
  source_form?: string;
  source_url?: string;
  form_id?: string;
  contact_id?: string;
  id?: string;
};

function pick(obj: GhlPayload, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function splitFullName(full: string | null): { first: string | null; last: string | null } {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ── Forward a captured lead into GHL ──────────────────────────────────
// Fire-and-forget: never blocks the intake response. Requires GHL_PIT
// (Private Integration Token) and GHL_LOCATION_ID env vars in Vercel.
// Creates a GHL Contact tagged "website-lead", then creates an
// Opportunity in the configured pipeline at "New Lead" stage when both
// GHL_PIPELINE_ID and GHL_PIPELINE_STAGE_NEW_LEAD are set.
async function forwardToGhl(opts: {
  first: string | null;
  last: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  sourceForm: string | null;
}): Promise<{ ghlContactId: string | null; error: string | null }> {
  const pit = process.env.GHL_PIT;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!pit || !locationId) {
    return { ghlContactId: null, error: "GHL_PIT or GHL_LOCATION_ID not set" };
  }

  const headers = {
    Authorization: `Bearer ${pit}`,
    Version: "2021-07-28",
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // 1) Create / upsert contact
  //    GHL returns 400 with meta.contactId when an email/phone matches an
  //    existing contact. Treat that as success and use the existing id so the
  //    opportunity step still runs.
  let ghlContactId: string | null = null;
  try {
    const body = {
      locationId,
      firstName: opts.first || undefined,
      lastName: opts.last || undefined,
      email: opts.email || undefined,
      phone: opts.phone || undefined,
      companyName: opts.company || undefined,
      source: opts.sourceForm || "laborforcelink.com",
      tags: ["website-lead", "new-lead"],
    };
    const contactRes = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const raw = await contactRes.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch {}
    const j = parsed as {
      contact?: { id?: string };
      meta?: { contactId?: string };
      message?: string;
    } | null;

    if (contactRes.ok) {
      ghlContactId = j?.contact?.id || null;
    } else if (
      contactRes.status === 400 &&
      j?.meta?.contactId
    ) {
      // Duplicate — GHL handed us the existing contact id. Use it.
      ghlContactId = j.meta.contactId;
      // Best-effort: PUT new tags onto the existing contact so it still
      // shows up in the website-lead segment.
      try {
        await fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            tags: ["website-lead", "new-lead"],
            customFields: opts.notes ? [{ key: "last_message", field_value: opts.notes }] : undefined,
          }),
        });
      } catch {}
    } else {
      console.error("[intake] GHL contact create failed", contactRes.status, raw.slice(0, 400));
      return {
        ghlContactId: null,
        error: `contact ${contactRes.status}: ${raw.slice(0, 200)}`,
      };
    }
  } catch (e) {
    console.error("[intake] GHL contact fetch threw", e);
    return { ghlContactId: null, error: `contact fetch threw: ${String(e).slice(0, 200)}` };
  }

  // 2) Optional: create an opportunity if pipeline + stage are configured
  const pipelineId = process.env.GHL_PIPELINE_ID;
  const stageId = process.env.GHL_PIPELINE_STAGE_NEW_LEAD;
  if (ghlContactId && pipelineId && stageId) {
    try {
      const oppName = [opts.first, opts.last].filter(Boolean).join(" ") || opts.company || opts.email || "New Lead";
      await fetch("https://services.leadconnectorhq.com/opportunities/", {
        method: "POST",
        headers,
        body: JSON.stringify({
          locationId,
          pipelineId,
          pipelineStageId: stageId,
          name: oppName,
          status: "open",
          contactId: ghlContactId,
          monetaryValue: 0,
          source: opts.sourceForm || "laborforcelink.com",
        }),
      });
    } catch {
      // opportunity creation failure doesn't roll back contact
    }
  }

  return { ghlContactId, error: null };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const auth = request.headers.get("authorization") || "";
  const bearerToken = auth.replace(/^Bearer\s+/i, "").trim();
  const expectedToken = process.env.LEAD_INTAKE_TOKEN;
  const provided = bearerToken || queryToken;

  if (expectedToken && provided && provided !== expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders() }
    );
  }

  let payload: GhlPayload;
  try {
    payload = (await request.json()) as GhlPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders() }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    return NextResponse.json(
      { error: "Supabase env vars missing" },
      { status: 500, headers: corsHeaders() }
    );
  }

  const client = createClient(supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let first = pick(payload, "first_name", "firstName");
  let last = pick(payload, "last_name", "lastName");

  if (!first && !last) {
    const full = pick(payload, "full_name", "fullName", "name");
    const split = splitFullName(full);
    first = split.first;
    last = split.last;
  }

  const email = pick(payload, "email");
  const phone = pick(payload, "phone");
  const company = pick(payload, "company", "company_name", "companyName");
  const title = pick(payload, "title");
  const notes = pick(payload, "notes", "message");
  const sourceForm = pick(payload, "source_form", "form_id");
  const sourceUrl = pick(payload, "source_url");
  const ghlContactIdInbound = pick(payload, "contact_id", "id");

  // 1) Try to forward to GHL FIRST so the captured ghl_contact_id is
  //    saved on the Supabase row in the same insert. Fire-and-forget on
  //    failure so the lead is never lost.
  const ghlResult = await forwardToGhl({
    first, last, email, phone, company, notes, sourceForm,
  });

  const sourceStr = pick(payload, "source", "source_form") || sourceForm || sourceUrl || "";
  const trade = tradeFrom(sourceStr, sourceUrl, pick(payload, "trades"));
  const language = languageFrom(sourceStr, sourceUrl);
  const market = marketFrom(sourceStr, sourceUrl);

  // Auto-tags: origin first (trade / market / language / source), then a few
  // answer-derived flags so staff can filter on them without opening the row.
  const autoTags: string[] = [];
  if (trade) autoTags.push(`trade:${trade.toLowerCase()}`);
  if (market) autoTags.push(`market:${market.toLowerCase().replace(/[,\s]+/g, "-")}`);
  autoTags.push(`lang:${language.toLowerCase()}`);
  if (sourceStr) autoTags.push(`source:${sourceStr.replace(/^\/+|\/+$/g, "")}`);
  const yes = (v: string | null) => !!v && /^(yes|s[ií])$/i.test(v.trim());
  if (yes(pick(payload, "business_insurance"))) autoTags.push("insured");
  if (yes(pick(payload, "workers_comp"))) autoTags.push("workers-comp");
  if (yes(pick(payload, "warranty"))) autoTags.push("warranty");
  if (yes(pick(payload, "w9"))) autoTags.push("w9");
  if (yes(pick(payload, "fluent_english")) || yes(pick(payload, "crew_english"))) autoTags.push("english-on-crew");
  if (/sole focus/i.test(pick(payload, "project_focus") || "")) autoTags.push("sole-focus");
  const avail = pick(payload, "availability") || "";
  if (/full time/i.test(avail)) autoTags.push("full-time");
  const start = pick(payload, "start_timeline") || "";
  if (/immediate/i.test(start)) autoTags.push("starts-now");

  // Every field the 9-step crew application posts. Values arrive in English
  // even from the Spanish pages (data-val on the option buttons).
  const crew = {
    business_type:      pick(payload, "business_type"),
    trades_offered:     pick(payload, "trades"),
    years_in_business:  pick(payload, "years"),
    social_url:         pick(payload, "social"),
    yard_location:      pick(payload, "yard_location"),
    business_insurance: pick(payload, "business_insurance"),
    workers_comp:       pick(payload, "workers_comp"),
    license_number:     pick(payload, "license"),
    pickup_trucks:      pick(payload, "pickup_trucks"),
    dump_trucks:        pick(payload, "dump_trucks"),
    dump_trailers:      pick(payload, "dump_trailers"),
    skid_steer:         pick(payload, "skid_steer"),
    hand_tools:         pick(payload, "hand_tools"),
    vehicle_lettering:  pick(payload, "vehicle_lettering"),
    crews_managing:     pick(payload, "crews_managing"),
    availability:       pick(payload, "availability"),
    start_timeline:     pick(payload, "start_timeline"),
    min_crew_size:      pick(payload, "min_crew_size"),
    daily_start:        pick(payload, "daily_start"),
    daily_end:          pick(payload, "daily_end"),
    site_manager:       pick(payload, "site_manager"),
    first_language:     pick(payload, "first_language"),
    second_language:    pick(payload, "second_language"),
    fluent_english:     pick(payload, "fluent_english"),
    crew_english:       pick(payload, "crew_english"),
    foreman:            pick(payload, "foreman"),
    comm_preference:    pick(payload, "comm_preference"),
    heard_from:         pick(payload, "heard_from"),
    project_focus:      pick(payload, "project_focus"),
    warranty:           pick(payload, "warranty"),
    price_per_sqft:     pick(payload, "price_per_sqft"),
    install_process:    pick(payload, "install_process"),
    w9:                 pick(payload, "w9"),
    checklists:         pick(payload, "checklists"),
  };

  const { data, error } = await client
    .from("crm_contacts")
    .insert({
      first_name: first,
      last_name: last,
      email,
      phone,
      company,
      title,
      notes,
      lead_source: sourceStr || "laborforcelink.com",
      source_form: sourceForm,
      source_url: sourceUrl,
      pipeline_stage: "New Application",
      trade,
      market,
      language,
      ...crew,
      tags: autoTags,
      ghl_contact_id: ghlResult.ghlContactId || ghlContactIdInbound,
      // Populate ghl_date_added on every website intake so the CRM list
      // sorts new leads to the top alongside historical GHL-migrated rows.
      ghl_date_added: new Date().toISOString(),
      raw_payload: payload as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, ghl_error: ghlResult.error },
      { status: 500, headers: corsHeaders() }
    );
  }

  // 2) ntfy.sh push notification — fire and forget
  try {
    const leadName = [first, last].filter(Boolean).join(" ") || company || "New Lead";
    const contactUrl = `https://crm.laborforcelink.com/contacts/${data?.id}`;
    await fetch("https://ntfy.sh/em-leads-xk7", {
      method: "POST",
      headers: {
        "Title": `🔥 New Lead — ${leadName}`,
        "Priority": "high",
        "Tags": "rotating_light",
      },
      body: [
        phone ? `📞 ${phone}` : "📞 No phone provided",
        company ? `🏢 ${company}` : null,
        `Source: ${sourceForm || sourceUrl || "website"}`,
        `→ ${contactUrl}`,
      ].filter(Boolean).join("\n"),
    });
  } catch {
    // never block lead capture
  }

  return NextResponse.json(
    {
      ok: true,
      id: data?.id,
      ghl_contact_id: ghlResult.ghlContactId,
      ghl_error: ghlResult.error,
    },
    { status: 200, headers: corsHeaders() }
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: true, endpoint: "leads intake", method: "POST" },
    { status: 200, headers: corsHeaders() }
  );
}
