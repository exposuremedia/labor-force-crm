-- Pipeline stages — modeled after GHL Opportunities.
-- Adds three columns to crm_contacts so each contact can be tracked as
-- an opportunity through the sales funnel.

alter table crm_contacts
  add column if not exists pipeline_stage text,
  add column if not exists opportunity_value numeric(12,2),
  add column if not exists opportunity_source text;

-- Allowed values (enforced at the app layer; keep DB flexible):
--   New Lead | Contacted | Interested | Proposal Needed
--   Proposal Sent | Follow Up | Closed - Won | Not interested
