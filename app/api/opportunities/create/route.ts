// Staff-created opportunity endpoint.
// Unlike /api/leads/intake (which receives website form submissions and
// forwards to GHL + pings ntfy.sh), this endpoint is for opportunities
// added manually by staff from the Pipeline or Contacts UI.
//
// - Auth required (signed-in staff user)
// - Inserts a row into crm_contacts with all opportunity fields
// - Does NOT forward to GHL (those are tracked separately)
// - Does NOT send ntfy.sh notifications
// - Auto-detects trade from phone area code if not specified

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tradeFrom, type Trade } from "@/lib/trade";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  notes?: string | null;
  pipeline_stage?: PipelineStage | null;
  opportunity_value?: number | string | null;
  opportunity_source?: string | null;
  trade?: Trade | null;
  tags?: string[] | null;
};

function splitFullName(full: string | null | undefined): { first: string | null; last: string | null } {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let first = body.first_name?.trim() || null;
  let last = body.last_name?.trim() || null;
  if (!first && !last && body.full_name) {
    const split = splitFullName(body.full_name);
    first = split.first;
    last = split.last;
  }

  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;
  const company = body.company?.trim() || null;

  // Need at least something to identify the contact.
  if (!first && !last && !email && !phone && !company) {
    return NextResponse.json(
      { error: "At least one of name, email, phone, or company is required" },
      { status: 400 }
    );
  }

  // Validate pipeline stage if provided.
  let stage: PipelineStage = "New Application";
  if (body.pipeline_stage) {
    if ((PIPELINE_STAGES as readonly string[]).includes(body.pipeline_stage)) {
      stage = body.pipeline_stage;
    } else {
      return NextResponse.json(
        { error: `Invalid pipeline_stage. Allowed: ${PIPELINE_STAGES.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Trade: explicit takes priority; else infer from whatever text we have.
  let trade: Trade | null = null;
  if (body.trade === "SCREEN" || body.trade === "CONCRETE" || body.trade === "PATIO" || body.trade === "TURF") {
    trade = body.trade;
  } else {
    trade = tradeFrom(body.trade, company);
  }

  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      first_name: first,
      last_name: last,
      email,
      phone,
      company,
      title: body.title?.trim() || null,
      notes: body.notes?.trim() || null,
      lead_source: "manual",
      source_form: "staff-add-opportunity",
      pipeline_stage: stage,
      opportunity_value: numOrNull(body.opportunity_value),
      opportunity_source: body.opportunity_source?.trim() || null,
      trade,
      tags: body.tags ?? [],
      ghl_date_added: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
