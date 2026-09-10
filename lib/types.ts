export const LEAD_STATUSES = ["Hot", "Warm", "Cold", "Customer", "Lost"] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

// Crew application funnel — mirrors the GHL-style Opportunity board.
export const PIPELINE_STAGES = [
  "New Application",
  "Reviewing",
  "Phone Screen",
  "Docs Requested",
  "Approved",
  "Active Crew",
  "On Hold",
  "Not a Fit",
] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

export type Trade = "SCREEN" | "CONCRETE" | "PATIO" | "TURF";
export type Language = "EN" | "ES";

export type Contact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  notes: string | null;
  lead_source: string | null;
  source_form: string | null;
  source_url: string | null;
  ghl_contact_id: string | null;
  owner_id: string | null;
  lead_status: LeadStatus | null;
  pipeline_stage: PipelineStage | null;
  opportunity_value: number | null;
  opportunity_source: string | null;

  // ── Labor Force Link: routing ──
  trade: Trade | null;
  market: string | null;
  language: Language | null;

  // ── business ──
  business_type: string | null;
  trades_offered: string | null;
  years_in_business: string | null;
  social_url: string | null;
  yard_location: string | null;

  // ── insurance & licensing ──
  business_insurance: string | null;
  workers_comp: string | null;
  license_number: string | null;

  // ── equipment ──
  pickup_trucks: string | null;
  dump_trucks: string | null;
  dump_trailers: string | null;
  skid_steer: string | null;
  hand_tools: string | null;
  vehicle_lettering: string | null;

  // ── availability ──
  crews_managing: string | null;
  availability: string | null;
  start_timeline: string | null;
  min_crew_size: string | null;
  daily_start: string | null;
  daily_end: string | null;

  // ── team & comms ──
  site_manager: string | null;
  first_language: string | null;
  second_language: string | null;
  fluent_english: string | null;
  crew_english: string | null;
  foreman: string | null;
  comm_preference: string | null;
  heard_from: string | null;

  // ── how they work ──
  project_focus: string | null;
  warranty: string | null;
  price_per_sqft: string | null;
  install_process: string | null;

  // ── compliance ──
  w9: string | null;
  checklists: string | null;

  tags: string[] | null;
  created_at: string;
  updated_at: string;
  ghl_date_added: string | null;
};

export type Note = {
  id: string;
  contact_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
};
