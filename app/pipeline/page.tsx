import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import { Sidebar } from "../components/Sidebar";
import { MobileNav } from "../components/MobileNav";
import { AddOpportunityButton } from "../components/AddOpportunityModal";
import { KanbanBoard } from "./KanbanBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: contacts } = await supabase
    .from("crm_contacts")
    .select("*")
    .order("ghl_date_added", { ascending: false, nullsFirst: false })
    .limit(1000);

  const list = (contacts || []) as Contact[];
  const total = list.length;
  const totalValue = list.reduce((s, c) => s + (c.opportunity_value || 0), 0);

  return (
    <div className="crm-shell">
      <Sidebar
        active="pipeline"
        userEmail={user?.email}
        userRole={profile?.role}
      />
      <main className="crm-main" style={{ overflowX: "hidden" }}>
        <MobileNav title="Pipeline" />
        {/* Header bar — pipeline selector + count + actions */}
        <div className="ghl-header">
          <div className="ghl-header-left">
            <button className="ghl-pipeline-select" type="button">
              <span className="ghl-pipeline-name">Crew Pipeline</span>
              <span className="ghl-pipeline-chev">▾</span>
            </button>
            <span className="ghl-count-chip">
              {total} opportunit{total === 1 ? "y" : "ies"}
              {totalValue > 0 ? ` · ${totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}` : ""}
            </span>
          </div>
          <div className="ghl-header-right">
            <button className="ghl-icon-btn" type="button" title="Grid view" aria-label="Grid view">▦</button>
            <button className="ghl-icon-btn" type="button" title="Import" aria-label="Import">↓</button>
            <AddOpportunityButton />
          </div>
        </div>

        <KanbanBoard initialContacts={list} />
      </main>
    </div>
  );
}
