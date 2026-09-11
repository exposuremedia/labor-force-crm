"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact, Note, LeadStatus, PipelineStage } from "@/lib/types";
import { PIPELINE_STAGES } from "@/lib/types";

function statusPillStyle(status: LeadStatus | null): React.CSSProperties {
  switch (status) {
    case "Hot":
      return { background: "var(--color-danger-soft)", color: "var(--color-danger)" };
    case "Warm":
      return { background: "var(--color-sand)", color: "var(--color-charcoal)" };
    case "Cold":
      return { background: "var(--color-cream)", color: "var(--color-stone)" };
    case "Customer":
      return { background: "var(--color-success-soft)", color: "var(--color-success)" };
    case "Lost":
      return { background: "var(--color-cream)", color: "var(--color-stone)" };
    default:
      return {};
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ContactEditor({
  contact,
  initialNotes,
  statuses,
}: {
  contact: Contact;
  initialNotes: Note[];
  statuses: LeadStatus[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const [first, setFirst] = useState(contact.first_name || "");
  const [last, setLast] = useState(contact.last_name || "");
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [company, setCompany] = useState(contact.company || "");
  const [title, setTitle] = useState(contact.title || "");
  const [notesField, setNotesField] = useState(contact.notes || "");
  const [status, setStatus] = useState<LeadStatus | "">(
    (contact.lead_status as LeadStatus) || ""
  );
  const [tags, setTags] = useState<string[]>(contact.tags || []);
  const [newTag, setNewTag] = useState("");

  // Opportunity fields
  const [pipelineStage, setPipelineStage] = useState<PipelineStage | "">(
    (contact.pipeline_stage as PipelineStage) || ""
  );
  const [oppSource, setOppSource] = useState<string>(contact.opportunity_source || "");

  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNote, setNewNote] = useState("");

  function flash(msg: string) {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 2000);
  }

  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try {
    const body = {
      first_name: first || null,
      last_name: last || null,
      email: email || null,
      phone: phone || null,
      company: company || null,
      title: title || null,
      notes: notesField || null,
      lead_status: status || null,
      tags,
      pipeline_stage: pipelineStage || null,
      opportunity_source: oppSource || null,
    };
    const r = await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      flash("Saved");
      startTransition(() => router.refresh());
    } else {
      const t = await r.text();
      setError("Save failed. Please try again.");
    }
    } catch { setError("Connection lost. Your changes have not been saved. Please try again."); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    const r = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
    if (r.ok) {
      router.push("/");
    } else {
      const t = await r.text();
      alert("Delete failed: " + t.slice(0, 200));
    }
  }

  async function addNote() {
    if (!newNote.trim() || noteSaving) return;
    setNoteSaving(true); setError("");
    try {
    const r = await fetch(`/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contact.id, body: newNote }),
    });
    if (r.ok) {
      const inserted = (await r.json()) as Note;
      setNotes(ns => [inserted, ...ns]);
      setNewNote("");
    } else {
      const t = await r.text();
      setError("The note could not be saved. Please try again.");
    }
    } catch { setError("Connection lost. Your note has not been saved."); }
    finally { setNoteSaving(false); }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    const r = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (r.ok) {
      setNotes(notes.filter((n) => n.id !== id));
    }
  }

  function addTag() {
    const t = newTag.trim();
    if (!t || tags.includes(t)) {
      setNewTag("");
      return;
    }
    setTags([...tags, t]);
    setNewTag("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <section className="surface-card p-5">
          <h2 className="font-display text-lg text-[color:var(--color-ink)]">
            Details
          </h2>
          {error && <p className="opp-err" role="alert">{error}</p>}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" value={first} onChange={setFirst} />
            <Field label="Last name" value={last} onChange={setLast} />
            <Field label="Email" value={email} onChange={setEmail} />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Company" value={company} onChange={setCompany} />
            <Field label="Title" value={title} onChange={setTitle} />
          </div>
          <div className="mt-3">
            <label className="block text-xs text-[color:var(--color-olive)] mb-1">
              Notes (intake)
            </label>
            <textarea
              className="input min-h-[80px]"
              value={notesField}
              onChange={(e) => setNotesField(e.target.value)}
            />
          </div>

          <div className="crm-detail-actions mt-4 flex items-center gap-3 pt-3 border-t border-[color:var(--color-border-cream)]">
            <button onClick={save} disabled={pending || saving} className="btn-primary">
              {pending || saving ? "Saving…" : "Save changes"}
            </button>
            <button onClick={remove} className="btn-ghost" style={{ color: "var(--color-danger)" }}>
              Delete contact
            </button>
            {savedFlash ? (
              <span className="text-xs text-[color:var(--color-success)] ml-2">
                ✓ {savedFlash}
              </span>
            ) : null}
          </div>
        </section>

        {/* ── Crew Application — every answer from the 9-step form ── */}
        {(() => {
          const GROUPS: { title: string; rows: [string, string | null][] }[] = [
            { title: "Where They Came From", rows: [
              ["Trade", contact.trade], ["Market", contact.market], ["Language", contact.language],
              ["Source", contact.source_form || contact.lead_source],
            ]},
            { title: "Business", rows: [
              ["Operating As", contact.business_type], ["Trades Offered", contact.trades_offered],
              ["Years in Business", contact.years_in_business], ["Yard / Operates Out Of", contact.yard_location],
              ["Social", contact.social_url],
            ]},
            { title: "Insurance & Licensing", rows: [
              ["Business Insurance", contact.business_insurance], ["Workers Comp", contact.workers_comp],
              ["License #", contact.license_number],
            ]},
            { title: "Equipment", rows: [
              ["Pickup Trucks", contact.pickup_trucks], ["Dump Trucks", contact.dump_trucks],
              ["Dump Trailers", contact.dump_trailers], ["Skid Steer", contact.skid_steer],
              ["Hand Tools", contact.hand_tools], ["Lettering on Vehicles", contact.vehicle_lettering],
            ]},
            { title: "Availability", rows: [
              ["Crews Managing", contact.crews_managing], ["Availability", contact.availability],
              ["Can Start", contact.start_timeline], ["Min Crew Size", contact.min_crew_size],
              ["Daily Start", contact.daily_start], ["Daily End", contact.daily_end],
            ]},
            { title: "Team & Comms", rows: [
              ["Project Manager", contact.site_manager], ["First Language", contact.first_language],
              ["Second Language", contact.second_language], ["Fluent English", contact.fluent_english],
              ["Crew Speaks English", contact.crew_english], ["Foreman On-Site", contact.foreman],
              ["Best Contact Method", contact.comm_preference], ["Heard About Us", contact.heard_from],
            ]},
            { title: "How They Work", rows: [
              ["Project Focus", contact.project_focus], ["Warranty", contact.warranty],
              ["Price / Sq Ft", contact.price_per_sqft], ["Install Process", contact.install_process],
            ]},
            { title: "Compliance", rows: [
              ["Can Provide W9", contact.w9], ["Follows Job Checklists", contact.checklists],
            ]},
          ];
          const filled = GROUPS
            .map((g) => ({ ...g, rows: g.rows.filter(([, v]) => v != null && String(v).trim() !== "") }))
            .filter((g) => g.rows.length > 0);
          if (filled.length === 0) return null;
          return (
            <section className="surface-card p-5">
              <h2 className="font-display text-lg text-[color:var(--color-ink)]">
                Crew Application
              </h2>
              {filled.map((g) => (
                <div key={g.title} style={{ marginTop: 18 }}>
                  <div style={{
                    fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
                    color: "var(--color-brand)", fontWeight: 700, marginBottom: 8,
                  }}>{g.title}</div>
                  <dl style={{
                    display: "grid", gridTemplateColumns: "minmax(150px,auto) 1fr",
                    columnGap: 18, rowGap: 7, margin: 0,
                  }}>
                    {g.rows.map(([k, v]) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt style={{ color: "var(--color-ink-48)", fontSize: 13 }}>{k}</dt>
                        <dd style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </section>
          );
        })()}

        <section className="surface-card p-5">
          <h2 className="font-display text-lg text-[color:var(--color-ink)]">
            Activity & Notes
          </h2>
          <div className="mt-3 flex gap-2">
            <textarea
              placeholder="Log a call, meeting note, or follow-up..."
              className="input min-h-[60px] flex-1"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button onClick={addNote} disabled={noteSaving || !newNote.trim()} className="btn-primary self-start">
              Add
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {notes.length === 0 ? (
              <li className="text-sm text-[color:var(--color-stone)] italic">
                No notes yet.
              </li>
            ) : null}
            {notes.map((n) => (
              <li
                key={n.id}
                className="surface-card p-3 flex items-start justify-between gap-3"
                style={{ borderRadius: 10 }}
              >
                <div className="flex-1">
                  <div className="text-xs text-[color:var(--color-olive)]">
                    {formatDateTime(n.created_at)}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-charcoal)] whitespace-pre-wrap">
                    {n.body}
                  </div>
                </div>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="text-xs text-[color:var(--color-stone)] hover:text-[color:var(--color-danger)]"
                  title="Delete note"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="surface-card p-5">
          <h2 className="font-display text-lg text-[color:var(--color-ink)]">
            Status
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setStatus("")}
              className="pill"
              style={
                status === ""
                  ? { background: "var(--color-ink)", color: "var(--color-parchment)" }
                  : undefined
              }
            >
              None
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="pill"
                style={
                  status === s
                    ? { background: "var(--color-ink)", color: "var(--color-parchment)" }
                    : statusPillStyle(s)
                }
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[color:var(--color-olive)]">
            Click Save changes below the details to apply.
          </p>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-lg text-[color:var(--color-ink)]">
            Tags
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.length === 0 ? (
              <span className="text-xs text-[color:var(--color-stone)] italic">
                No tags
              </span>
            ) : null}
            {tags.map((t) => (
              <span key={t} className="pill flex items-center gap-1">
                {t}
                <button
                  onClick={() => removeTag(t)}
                  className="text-[color:var(--color-stone)] hover:text-[color:var(--color-danger)] -mr-1"
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="new-tag"
              className="input"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
            <button onClick={addTag} className="btn-ghost">
              Add
            </button>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-lg text-[color:var(--color-ink)]">
            Opportunity
          </h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs text-[color:var(--color-olive)] mb-1">
                Pipeline stage
              </label>
              <select
                className="input"
                value={pipelineStage}
                onChange={(e) => setPipelineStage(e.target.value as PipelineStage | "")}
              >
                <option value="">— Not in pipeline —</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[color:var(--color-olive)] mb-1">
                Opportunity source
              </label>
              <input
                type="text"
                className="input"
                value={oppSource}
                onChange={(e) => setOppSource(e.target.value)}
                placeholder="e.g. referral, cold call, website application"
              />
            </div>
            {contact.trade ? (
              <div>
                <label className="block text-xs text-[color:var(--color-olive)] mb-1">
                  Trade
                </label>
                <span
                  className="crm-region-badge"
                  data-region={contact.trade}
                  title={`${contact.trade} crew${contact.market ? " — " + contact.market : ""}`}
                >
                  {contact.trade}
                </span>
                <p className="mt-2 text-xs text-[color:var(--color-stone)]">
                  Recorded from the application’s trade and source.
                </p>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-[color:var(--color-olive)]">
            Click Save changes below the details to apply.
          </p>
        </section>

        {contact.source_form || contact.source_url ? (
          <section className="surface-card p-5">
            <h2 className="font-display text-lg text-[color:var(--color-ink)]">
              Source
            </h2>
            <div className="mt-3 text-xs text-[color:var(--color-charcoal)] space-y-1">
              {contact.source_form ? (
                <div>
                  <span className="text-[color:var(--color-olive)]">Form: </span>
                  {contact.source_form}
                </div>
              ) : null}
              {contact.source_url ? (
                <div>
                  <span className="text-[color:var(--color-olive)]">URL: </span>
                  <a
                    href={contact.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {contact.source_url.slice(0, 50)}
                    {contact.source_url.length > 50 ? "…" : ""}
                  </a>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-[color:var(--color-olive)] mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
