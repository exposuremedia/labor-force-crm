import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Note, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { Sidebar } from "../../components/Sidebar";
import { MobileNav } from "../../components/MobileNav";
import { ContactEditor } from "./ContactEditor";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function formatName(c: Contact): string {
  const first = (c.first_name || "").trim();
  const last = (c.last_name || "").trim();
  const name = [first, last].filter(Boolean).join(" ").trim();
  return titleCase(name || c.company || c.email || c.phone || "Unnamed");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ContactDetailPage({ params }: { params: Params }) {
  const { id } = await params;
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

  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!contact) notFound();

  const c = contact as Contact;

  const { data: notes } = await supabase
    .from("crm_notes")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const noteList = (notes || []) as Note[];

  const displayName = formatName(c);

  return (
    <div className="crm-shell">
      <Sidebar
        active="contacts"
        userEmail={user?.email}
        userRole={profile?.role}
      />

      <main className="crm-main">
        <MobileNav title="Contact" />
        <div className="crm-detail-wrap">
          <nav className="crm-detail-crumb" aria-label="Breadcrumb">
            <Link href="/">Contacts</Link>
            <span className="crm-detail-crumb-sep" aria-hidden="true">/</span>
            <span className="crm-detail-crumb-current">{displayName}</span>
          </nav>

          <h1 className="crm-detail-h1">{displayName}</h1>

          <div className="crm-detail-meta">
            <span>Created {formatDateTime(c.created_at)}</span>
            {c.lead_source ? <span>· Source: {c.lead_source}</span> : null}
            {c.ghl_contact_id ? (
              <span>· GHL ID: {c.ghl_contact_id.slice(0, 12)}…</span>
            ) : null}
          </div>

          <ContactEditor
            contact={c}
            initialNotes={noteList}
            statuses={LEAD_STATUSES as readonly LeadStatus[] as LeadStatus[]}
          />
        </div>
      </main>
    </div>
  );
}
