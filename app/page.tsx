import Link from "next/link";
import Form from "next/form";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { AddOpportunityButton } from "./components/AddOpportunityModal";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  tag?: string;
  trade?: string;
  lang?: string;
  market?: string;
}>;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileQuery = user
    ? supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  let query = supabase
    .from("crm_contacts")
    .select("*")
    .order("ghl_date_added", { ascending: false, nullsFirst: false })
    .limit(500);

  if (params.q) {
    const q = params.q.trim();
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,company.ilike.%${q}%`
    );
  }

  if (params.status && (LEAD_STATUSES as readonly string[]).includes(params.status)) {
    query = query.eq("lead_status", params.status);
  }

  if (params.tag) {
    query = query.contains("tags", [params.tag]);
  }

  if (params.trade) {
    query = query.eq("trade", params.trade);
  }

  if (params.lang) {
    query = query.eq("language", params.lang);
  }

  if (params.market) {
    query = query.eq("market", params.market);
  }

  const [{ data: profile }, { data: contacts }, { data: facets }] = await Promise.all([
    profileQuery,
    query,
    supabase.from("crm_contacts").select("market,tags").limit(5000),
  ]);
  const list = (contacts || []) as Contact[];
  const marketRows = facets;
  const tagRows = facets;
  const markets = Array.from(
    new Set(((marketRows || []) as { market: string | null }[])
      .map((r) => r.market)
      .filter((m): m is string => !!m))
  ).sort();

  const tagCounts = new Map<string, number>();
  for (const r of (tagRows || []) as { tags: string[] | null }[]) {
    for (const t of r.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  const topTags = Array.from(tagCounts.entries())
    .filter(([t]) => !t.startsWith("source:"))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 18);

  const now = new Date();
  const aDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const totalCount = list.length;
  const hotCount = list.filter((c) => c.lead_status === "Hot").length;
  const newToday = list.filter(
    (c) => new Date((c.ghl_date_added ?? c.created_at) as string) > aDayAgo
  ).length;
  const thisWeek = list.filter(
    (c) => new Date((c.ghl_date_added ?? c.created_at) as string) > aWeekAgo
  ).length;

  function isNew(c: Contact): boolean {
    return new Date((c.ghl_date_added ?? c.created_at) as string) > aDayAgo;
  }
  function initials(c: Contact): string {
    const f = (c.first_name ?? "")[0] ?? "";
    const l = (c.last_name ?? "")[0] ?? "";
    return (
      (f + l).toUpperCase() ||
      ((c.company ?? "?")[0] ?? "?").toUpperCase()
    );
  }

  const STATUS: Record<string, { bg: string; color: string; dot: string }> = {
    Hot:      { bg: "var(--color-hot-soft)",      color: "var(--color-hot)",      dot: "#c0392b" },
    Warm:     { bg: "var(--color-warm-soft)",     color: "var(--color-warm)",     dot: "#b07a17" },
    Cold:     { bg: "var(--color-cold-soft)",     color: "var(--color-cold)",     dot: "#1f6fb2" },
    Customer: { bg: "var(--color-customer-soft)", color: "var(--color-customer)", dot: "#2f7a3a" },
    Lost:     { bg: "var(--color-lost-soft)",     color: "var(--color-lost)",     dot: "#86868b" },
  };

  const activeStatus = params.status ?? "";
  function filterHref(key: string, value: string) {
    const next = new URLSearchParams();
    for (const [k,v] of Object.entries(params)) if (v) next.set(k,v);
    if (value) next.set(key,value); else next.delete(key);
    return next.size ? `/?${next}` : "/";
  }


  return (
    <div className="crm-shell">
      <Sidebar
        active="contacts"
        userEmail={user?.email}
        userRole={profile?.role}
        hotCount={hotCount}
      />
      <main className="crm-main">
        <MobileNav title="Contacts" />
        <div className="crm-topbar">
          <h1 className="crm-page-title">Contacts</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Form action="/" scroll={false}>
              {Object.entries(params).filter(([key,value]) => key !== "q" && value).map(([key,value]) => <input key={key} type="hidden" name={key} value={value} />)}
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search name, email, phone…"
                className="crm-search"
              />
            </Form>
            <AddOpportunityButton />
          </div>
        </div>

        <div className="crm-stats">
          <div className="crm-stat">
            <div className="crm-stat-label">Total leads</div>
            <div className="crm-stat-value">{totalCount}</div>
          </div>
          <div className="crm-stat">
            <div className="crm-stat-label">Hot</div>
            <div
              className="crm-stat-value"
              style={{ color: "var(--color-hot)" }}
            >
              {hotCount}
            </div>
          </div>
          <div className="crm-stat">
            <div className="crm-stat-label">New today</div>
            <div className="crm-stat-value">{newToday}</div>
          </div>
          <div className="crm-stat">
            <div className="crm-stat-label">This week</div>
            <div className="crm-stat-value">{thisWeek}</div>
          </div>
        </div>

        <div className="crm-filters" style={{ marginBottom: 4 }}>
          {[
            { key: "", label: "All Trades" },
            { key: "SCREEN", label: "Screen" },
            { key: "CONCRETE", label: "Concrete" },
            { key: "PATIO", label: "Patio" },
            { key: "TURF", label: "Turf" },
          ].map((t) => (
            <Link
              key={t.key || "all-trades"}
              scroll={false} href={filterHref("trade",t.key)}
              className={`crm-filter${(params.trade || "") === t.key ? " active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
          <span style={{ width: 12 }} />
          {[
            { key: "", label: "EN + ES" },
            { key: "EN", label: "English" },
            { key: "ES", label: "Español" },
          ].map((l) => (
            <Link
              key={l.key || "all-lang"}
              scroll={false} href={filterHref("lang",l.key)}
              className={`crm-filter${(params.lang || "") === l.key ? " active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {markets.length > 0 && (
          <div className="crm-filters" style={{ marginBottom: 4 }}>
            <Link
              scroll={false} href={filterHref("market","")}
              className={`crm-filter${!params.market ? " active" : ""}`}
            >
              All Locations
            </Link>
            {markets.map((m) => (
              <Link
                key={m}
                scroll={false} href={filterHref("market",m)}
                className={`crm-filter${params.market === m ? " active" : ""}`}
              >
                {m}
              </Link>
            ))}
          </div>
        )}

        {topTags.length > 0 && (
          <div className="crm-filters" style={{ marginBottom: 4, flexWrap: "wrap" }}>
            <Link
              scroll={false} href={filterHref("tag","")}
              className={`crm-filter${!params.tag ? " active" : ""}`}
            >
              All Tags
            </Link>
            {topTags.map(([t, n]) => (
              <Link
                key={t}
                scroll={false} href={filterHref("tag",t)}
                className={`crm-filter${params.tag === t ? " active" : ""}`}
              >
                {t} <span style={{ opacity: 0.5 }}>{n}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="crm-filters">
          {["", "Hot", "Warm", "Cold", "Customer", "Lost"].map((s) => (
            <Link
              key={s || "all"}
              scroll={false} href={filterHref("status",s)}
              className="crm-pill"
              data-active={
                (s === "" && !activeStatus) || s === activeStatus
                  ? "true"
                  : undefined
              }
            >
              {s || "All"}
            </Link>
          ))}
          <span className="crm-count">{list.length} contact{list.length === 1 ? "" : "s"}</span>
        </div>

        <div className="crm-col-header">
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Status</div>
          <div>Received</div>
        </div>

        <div className="crm-rows">
          {list.length === 0 && (
            <div className="crm-empty">No contacts found.</div>
          )}
          {list.map((c) => {
            const st = c.lead_status as string | null;
            const sty = st ? STATUS[st] ?? null : null;
            const displayName =
              [c.first_name, c.last_name].filter(Boolean).join(" ") ||
              c.company ||
              "—";
            return (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="crm-row"
              >
                <div className="crm-name-cell">
                  <div
                    className="crm-avatar"
                    style={
                      sty ? { background: sty.bg, color: sty.color } : {}
                    }
                  >
                    {initials(c)}
                  </div>
                  <span className="crm-name">{displayName}</span>
                  {c.trade && (
                    <span
                      className="crm-region-badge"
                      data-region={c.trade}
                      title={`${c.trade} crew${c.market ? " — " + c.market : ""}`}
                    >
                      {c.trade}
                    </span>
                  )}
                  {isNew(c) && <span className="crm-new-badge">NEW</span>}
                </div>
                <div className="crm-cell">{c.email ?? "—"}</div>
                <div className="crm-cell crm-mono">{c.phone ?? "—"}</div>
                <div className="crm-cell">
                  {sty ? (
                    <span
                      className="crm-status-badge"
                      style={{ background: sty.bg, color: sty.color }}
                    >
                      <span
                        className="crm-dot"
                        style={{ background: sty.dot }}
                      />
                      {st}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="crm-cell crm-mono">
                  {formatDate(c.ghl_date_added ?? c.created_at)}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
