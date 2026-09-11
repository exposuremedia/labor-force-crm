"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/types";
import type { Trade } from "@/lib/trade";

export function AddOpportunityButton({
  label = "+ Add opportunity",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={variant === "primary" ? "btn-primary" : "btn-ghost"}
        style={variant === "primary" ? { fontSize: 14, padding: "8px 16px" } : undefined}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && <AddOpportunityModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AddOpportunityModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState<PipelineStage>("New Application");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");
  const [trade, setRegion] = useState<Trade | "">("");
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!fullName.trim() && !email.trim() && !phone.trim() && !company.trim()) {
      setErr("Enter at least a name, email, phone, or company.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/opportunities/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          pipeline_stage: stage,
          opportunity_value: value === "" ? null : value,
          opportunity_source: source.trim() || null,
          trade: trade || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || `Failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      const j = (await res.json()) as { id?: string };
      onClose();
      // Refresh the current view (pipeline or contacts list) and jump to
      // the new contact if we got an id back.
      router.refresh();
      if (j.id) router.push(`/contacts/${j.id}`);
    } catch (e) {
      setErr("Network error: " + String(e).slice(0, 120));
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Add opportunity"
      className="opp-modal-backdrop"
      onCancel={(e) => { e.preventDefault(); if (!submitting) onClose(); }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="opp-modal">
        <div className="opp-modal-head">
          <h2 className="opp-modal-title">Add opportunity</h2>
          <button
            type="button"
            className="opp-modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="opp-modal-body">
          <div className="opp-grid">
            <Field label="Name" value={fullName} onChange={setFullName} autoComplete="name" />
            <Field label="Company" value={company} onChange={setCompany} autoComplete="organization" />
            <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            <Field label="Phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
          </div>

          <div className="opp-grid">
            <div>
              <label htmlFor="opp-pipeline" className="opp-label">Pipeline stage</label>
              <select
                className="input"
                id="opp-pipeline"
                value={stage}
                onChange={(e) => setStage(e.target.value as PipelineStage)}
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="opp-trade" className="opp-label">Trade</label>
              <select
                className="input"
                id="opp-trade"
                value={trade}
                onChange={(e) => setRegion(e.target.value as Trade | "")}
              >
                <option value="">Select a trade</option>
                <option value="SCREEN">Screen</option>
                <option value="CONCRETE">Concrete</option>
                <option value="PATIO">Patio</option>
                <option value="TURF">Turf</option>
              </select>
            </div>
            <div>
              <label htmlFor="opp-opportunity" className="opp-label">Opportunity value ($)</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                step="any"
                id="opp-opportunity"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Field label="Opportunity source" value={source} onChange={setSource} placeholder="e.g. referral, cold call" />
          </div>

          <div>
            <label htmlFor="opp-notes" className="opp-label">Notes</label>
            <textarea
              className="input"
              style={{ minHeight: 80 }}
              id="opp-notes"
                value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering about this lead"
            />
          </div>

          {err && <div className="opp-err">{err}</div>}

          <div className="opp-modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Create opportunity"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="opp-label">{label}</label>
      <input
        id={id}
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
    </div>
  );
}
