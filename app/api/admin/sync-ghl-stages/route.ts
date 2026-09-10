import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Pipeline = {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
};
type Opportunity = {
  id: string;
  name?: string;
  pipelineId: string;
  pipelineStageId: string;
  status?: string;
  contactId?: string;
  contact?: { id?: string; email?: string; phone?: string };
  monetaryValue?: number;
  source?: string;
};

function ghlHeaders(pit: string) {
  return {
    Authorization: `Bearer ${pit}`,
    Version: "2021-07-28",
    Accept: "application/json",
    "Content-Type": "application/json",
  } as Record<string, string>;
}

export async function POST(request: Request) {
  // Gate the route by a token so randoms can't trigger a full sync.
  const url = new URL(request.url);
  const provided = url.searchParams.get("token") ||
    (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.GHL_SYNC_TOKEN || process.env.LEAD_INTAKE_TOKEN;
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pit = process.env.GHL_PIT;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!pit || !locationId) {
    return NextResponse.json({ error: "GHL_PIT or GHL_LOCATION_ID not set" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }
  const sb = createClient(supabaseUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Fetch pipelines and find the Sales Pipeline (or first one)
  const pipelinesRes = await fetch(
    `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`,
    { headers: ghlHeaders(pit) }
  );
  if (!pipelinesRes.ok) {
    const t = await pipelinesRes.text();
    return NextResponse.json(
      { error: `pipelines ${pipelinesRes.status}`, body: t.slice(0, 300) },
      { status: 502 }
    );
  }
  const pipelinesJson = (await pipelinesRes.json()) as { pipelines?: Pipeline[] };
  const pipelines = pipelinesJson.pipelines || [];
  const pipeline =
    pipelines.find((p) => /sales/i.test(p.name)) || pipelines[0];
  if (!pipeline) {
    return NextResponse.json({ error: "no pipelines found" }, { status: 404 });
  }

  // Map stage id -> stage name (matches our PIPELINE_STAGES values)
  const stageMap: Record<string, string> = {};
  for (const s of pipeline.stages || []) stageMap[s.id] = s.name;

  // 2) Fetch all opportunities (paginate)
  const opps: Opportunity[] = [];
  let nextPageUrl: string | null =
    `https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&pipeline_id=${pipeline.id}&limit=100`;
  let pageGuard = 0;
  while (nextPageUrl && pageGuard < 30) {
    const r = await fetch(nextPageUrl, { headers: ghlHeaders(pit) });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json(
        { error: `opps ${r.status}`, body: t.slice(0, 300), pipeline: pipeline.name },
        { status: 502 }
      );
    }
    const j = (await r.json()) as {
      opportunities?: Opportunity[];
      meta?: { nextPageUrl?: string | null };
    };
    if (j.opportunities) opps.push(...j.opportunities);
    nextPageUrl = j.meta?.nextPageUrl || null;
    pageGuard++;
  }

  // 3) Update crm_contacts in batches: match by ghl_contact_id, fall back
  //    to email/phone when the contact id wasn't captured at intake time.
  let matched = 0;
  let updated = 0;
  const unmatched: { ghlOppId: string; contactId?: string; stage?: string }[] = [];

  for (const opp of opps) {
    const stage = stageMap[opp.pipelineStageId];
    if (!stage) continue;

    const ghlContactId = opp.contactId || opp.contact?.id;
    let crmRow: { id: string; pipeline_stage: string | null } | null = null;

    if (ghlContactId) {
      const r = await sb
        .from("crm_contacts")
        .select("id, pipeline_stage")
        .eq("ghl_contact_id", ghlContactId)
        .maybeSingle();
      if (r.data) crmRow = r.data;
    }

    // Email / phone fallback
    if (!crmRow && opp.contact?.email) {
      const r = await sb
        .from("crm_contacts")
        .select("id, pipeline_stage")
        .eq("email", opp.contact.email)
        .limit(1)
        .maybeSingle();
      if (r.data) crmRow = r.data;
    }
    if (!crmRow && opp.contact?.phone) {
      const r = await sb
        .from("crm_contacts")
        .select("id, pipeline_stage")
        .eq("phone", opp.contact.phone)
        .limit(1)
        .maybeSingle();
      if (r.data) crmRow = r.data;
    }

    if (!crmRow) {
      unmatched.push({ ghlOppId: opp.id, contactId: ghlContactId, stage });
      continue;
    }

    matched++;
    if (crmRow.pipeline_stage !== stage || (opp.monetaryValue ?? 0) > 0) {
      const { error } = await sb
        .from("crm_contacts")
        .update({
          pipeline_stage: stage,
          opportunity_value: opp.monetaryValue ?? null,
          opportunity_source: opp.source ?? null,
          // Backfill the GHL contact id if we matched via email/phone.
          ghl_contact_id: ghlContactId ?? undefined,
        })
        .eq("id", crmRow.id);
      if (!error) updated++;
    }
  }

  return NextResponse.json({
    ok: true,
    pipeline: pipeline.name,
    pipelineId: pipeline.id,
    stages: pipeline.stages?.map((s) => s.name) || [],
    opportunitiesFound: opps.length,
    matched,
    updated,
    unmatchedCount: unmatched.length,
    unmatchedSample: unmatched.slice(0, 8),
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    method: "POST",
    note:
      "POST with ?token=... to sync GHL Sales Pipeline stages into crm_contacts.pipeline_stage",
  });
}
