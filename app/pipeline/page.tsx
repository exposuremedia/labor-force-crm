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
            <h1 className="crm-page-title">Crew Pipeline</h1>
            <span className="ghl-count-chip">
              {total} opportunit{total === 1 ? "y" : "ies"}
            </span>
          </div>
          <div className="ghl-header-right">
            <AddOpportunityButton />
          </div>
        </div>

        <KanbanBoard initialContacts={list} />
      </main>
    </div>
  );
}
