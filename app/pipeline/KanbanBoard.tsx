"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Contact, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";

type Column = PipelineStage | "Unsorted";
const ALL_COLUMNS: Column[] = ["Unsorted", ...PIPELINE_STAGES];

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function contactName(c: Contact): string {
  const first = (c.first_name || "").trim();
  const last = (c.last_name || "").trim();
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || c.company || c.email || c.phone || "Unnamed";
}

export function KanbanBoard({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [overCol, setOverCol] = useState<Column | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [trade, setTrade] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("newest");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setContacts(initialContacts); }, [initialContacts]);
  const dragId = useRef<string | null>(null);
  const prevStage = useRef<PipelineStage | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return contacts.filter((c) => {
      if (trade && c.trade !== trade || language && c.language !== language) return false;
      const name = contactName(c).toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const company = (c.company || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        company.includes(q)
      );
    }).sort((a,b) => sort === "name" ? contactName(a).localeCompare(contactName(b)) : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [contacts, search, trade, language, sort]);

  const grouped = useMemo(() => {
    const g: Record<Column, Contact[]> = {} as Record<Column, Contact[]>;
    for (const col of ALL_COLUMNS) g[col] = [];
    for (const c of filtered) {
      const k = (c.pipeline_stage as PipelineStage | null) || "Unsorted";
      (g[k] ?? g.Unsorted).push(c);
    }
    return g;
  }, [filtered]);

  const totalOps = filtered.length;

  function onDragStart(e: React.DragEvent, c: Contact) {
    if (saving) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", c.id);
    dragId.current = c.id;
    prevStage.current = c.pipeline_stage;
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDrop(e: React.DragEvent, col: Column) {
    e.preventDefault();
    const id = dragId.current;
    const prev = prevStage.current;
    dragId.current = null;
    prevStage.current = null;
    setOverCol(null);
    if (!id) return;

    const next: PipelineStage | null = col === "Unsorted" ? null : col;
    if (prev === next) return;

    setSaving(true);
    setError("");
    setContacts((cs) =>
      cs.map((c) => (c.id === id ? { ...c, pipeline_stage: next } : c))
    );

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_stage: next }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      setError("Stage could not be saved. The card has been restored. Please try again.");
      setContacts((cs) =>
        cs.map((c) => (c.id === id ? { ...c, pipeline_stage: prev } : c))
      );
    } finally { setSaving(false); }
  }

  return (
    <div className="ghl-pipeline">
      {/* Sub-toolbar */}
      <div className="ghl-toolbar">
        <div className="ghl-toolbar-left">
          <button className="ghl-tool-btn" type="button" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Filters{trade || language ? " •" : ""}</button>
          <select className="ghl-tool-btn" aria-label="Sort opportunities" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest first</option><option value="name">Name A–Z</option>
          </select>
          <span className="ghl-result-count" aria-live="polite">{totalOps} result{totalOps === 1 ? "" : "s"}</span>
        </div>
        <div className="ghl-toolbar-right">
          <div className="ghl-search">
            <span className="ghl-search-icon" aria-hidden>⌕</span>
            <input
              type="search"
              placeholder="Search opportunities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showFilters && <div className="ghl-filter-panel">
        <label>Trade<select className="input" value={trade} onChange={e => setTrade(e.target.value)}><option value="">All trades</option>{["SCREEN","CONCRETE","PATIO","TURF"].map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Language<select className="input" value={language} onChange={e => setLanguage(e.target.value)}><option value="">All languages</option><option value="EN">English</option><option value="ES">Español</option></select></label>
        <button className="btn-ghost" onClick={() => { setTrade(""); setLanguage(""); setSearch(""); }}>Clear filters</button>
      </div>}
      {error && <p className="opp-err" role="alert">{error}</p>}
      {saving && <p role="status">Saving stage…</p>}
      {/* Stage columns */}
      <div className="ghl-board">
        {ALL_COLUMNS.map((col) => {
          const cards = grouped[col] || [];
          const isOver = overCol === col;
          return (
            <div
              key={col}
              className="ghl-col"
              data-stage={col}
              data-collapsed={collapsed.includes(col)}
              data-over={isOver ? "true" : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                if (overCol !== col) setOverCol(col);
              }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => onDrop(e, col)}
            >
              <div className="ghl-col-head">
                <div className="ghl-col-name">
                  <span>{col}</span>
                  <button className="ghl-col-chev" type="button" aria-label={`${collapsed.includes(col) ? "Expand" : "Collapse"} ${col}`} aria-expanded={!collapsed.includes(col)} onClick={() => setCollapsed(cs => cs.includes(col) ? cs.filter(c => c !== col) : [...cs,col])}>{collapsed.includes(col) ? "+" : "−"}</button>
                </div>
                <div className="ghl-col-meta">
                  <span>{cards.length} opportunit{cards.length === 1 ? "y" : "ies"}</span>
                </div>
              </div>

              <div className="ghl-col-body" hidden={collapsed.includes(col)}>
                {cards.map((c) => {
                  const name = contactName(c);
                  return (
                    <Link
                      key={c.id}
                      href={`/contacts/${c.id}`}
                      className="ghl-card"
                      draggable={!saving}
                      onDragEnd={() => { dragId.current = null; setOverCol(null); }}
                      onDragStart={(e) => onDragStart(e, c)}
                    >
                      <div className="ghl-card-head">
                        <div className="ghl-card-title">{name}</div>
                        {c.trade && (
                          <span
                            className="crm-region-badge ghl-card-region"
                            data-region={c.trade}
                            title={`${c.trade} crew${c.market ? " — " + c.market : ""}`}
                          >
                            {c.trade}
                          </span>
                        )}
                        <div className="ghl-card-owner" aria-hidden>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
                            <line x1="18" y1="2" x2="22" y2="6" />
                            <line x1="22" y1="2" x2="18" y2="6" />
                          </svg>
                        </div>
                      </div>
                      {(c.opportunity_source || c.lead_source) && (
                        <div className="ghl-card-row">
                          <span className="ghl-card-label">Source</span>
                          <span className="ghl-card-val">{c.opportunity_source || c.lead_source}</span>
                        </div>
                      )}

                      <div className="ghl-card-actions">View application →</div>
                    </Link>
                  );
                })}
                {cards.length === 0 && (
                  <div className="ghl-empty">No opportunities</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
