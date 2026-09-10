"use client";

import { useMemo, useRef, useState } from "react";
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
  return titleCase(name || c.company || c.email || c.phone || "Unnamed");
}

function fmtMoney(n: number | null): string {
  if (n == null || isNaN(n)) return "$0.00";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

// Simple SVG icons for the activity row at the bottom of each card.
function PhoneIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>); }
function ChatIcon()  { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>); }
function TagIcon()   { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/></svg>); }
function DocIcon()   { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>); }
function CheckIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>); }
function CalIcon()   { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>); }

export function KanbanBoard({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [overCol, setOverCol] = useState<Column | null>(null);
  const [search, setSearch] = useState("");
  const dragId = useRef<string | null>(null);
  const prevStage = useRef<PipelineStage | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
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
    });
  }, [contacts, search]);

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
      setContacts((cs) =>
        cs.map((c) => (c.id === id ? { ...c, pipeline_stage: prev } : c))
      );
    }
  }

  return (
    <div className="ghl-pipeline">
      {/* Sub-toolbar */}
      <div className="ghl-toolbar">
        <div className="ghl-toolbar-left">
          <button className="ghl-tool-btn" type="button">
            <span style={{ fontSize: 13 }}>⚙</span>
            <span>Advanced Filters</span>
          </button>
          <button className="ghl-tool-btn" type="button">
            <span style={{ fontSize: 13 }}>↕</span>
            <span>Sort</span>
          </button>
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

      {/* Stage columns */}
      <div className="ghl-board">
        {ALL_COLUMNS.map((col) => {
          const cards = grouped[col] || [];
          const total = cards.reduce((s, c) => s + (c.opportunity_value || 0), 0);
          const isOver = overCol === col;
          return (
            <div
              key={col}
              className="ghl-col"
              data-stage={col}
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
                  <button className="ghl-col-chev" type="button" aria-label="Collapse column">‹</button>
                </div>
                <div className="ghl-col-meta">
                  <span>{cards.length} Opportunities</span>
                  <span className="ghl-col-meta-dot" />
                  <span data-numeric>{fmtMoney(total)}</span>
                </div>
              </div>

              <div className="ghl-col-body">
                {cards.map((c) => {
                  const name = contactName(c);
                  return (
                    <Link
                      key={c.id}
                      href={`/contacts/${c.id}`}
                      className="ghl-card"
                      draggable
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
                          <span className="ghl-card-label">Opportunity Sou…</span>
                          <span className="ghl-card-val">{(c.opportunity_source || c.lead_source || "").toUpperCase()}</span>
                        </div>
                      )}
                      <div className="ghl-card-row">
                        <span className="ghl-card-label">Opportunity Val…</span>
                        <span className="ghl-card-val" data-numeric>{fmtMoney(c.opportunity_value)}</span>
                      </div>
                      <div className="ghl-card-actions">
                        <span className="ghl-act"><PhoneIcon /></span>
                        <span className="ghl-act"><ChatIcon /></span>
                        <span className="ghl-act"><TagIcon /></span>
                        <span className="ghl-act"><DocIcon /></span>
                        <span className="ghl-act"><CheckIcon /></span>
                        <span className="ghl-act"><CalIcon /></span>
                      </div>
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
