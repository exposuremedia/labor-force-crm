"use client";

import { useState } from "react";

export function EmbedForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email && !phone) {
      setErr("Email or phone is required.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/leads/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          email,
          phone,
          company_name: company,
          notes: message,
          source_form: "embed-contact",
          source_url:
            typeof window !== "undefined"
              ? document.referrer || window.location.href
              : null,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        setErr("Submit failed: " + t.slice(0, 120));
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch (e) {
      setErr("Network error: " + String(e).slice(0, 100));
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={titleStyle}>Thanks — we got it.</div>
          <div style={subStyle}>
            We&apos;ll reach out within one business day. If it&apos;s urgent,
            call or text{" "}
            <span style={{ whiteSpace: "nowrap" }}>+1 (631) 562-8002</span>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <form onSubmit={submit} style={cardStyle}>
        <div style={titleStyle}>Get Started</div>
        <div style={subStyle}>
          Tell us a little about your business and we&apos;ll be in touch.
        </div>

        <div style={fieldRow}>
          <Input label="Name" value={name} onChange={setName} autoComplete="name" />
        </div>
        <div style={fieldRow}>
          <Input label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        </div>
        <div style={fieldRow}>
          <Input label="Phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
        </div>
        <div style={fieldRow}>
          <Input label="Company" value={company} onChange={setCompany} autoComplete="organization" />
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>What can we help with?</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
          />
        </div>

        {err ? (
          <div
            style={{
              color: "#c0392b",
              fontSize: 14,
              margin: "4px 0 0",
              letterSpacing: "-0.014em",
            }}
          >
            {err}
          </div>
        ) : null}

        <button type="submit" disabled={submitting} style={btnStyle}>
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={inputStyle}
      />
    </>
  );
}

const FONT_STACK =
  '"SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
const DISPLAY_STACK =
  '"SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  fontFamily: FONT_STACK,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "#ffffff",
  border: "1px solid rgba(29, 29, 31, 0.08)",
  borderRadius: 18,
  padding: 32,
  color: "#1d1d1f",
};

const titleStyle: React.CSSProperties = {
  fontFamily: DISPLAY_STACK,
  fontSize: 28,
  fontWeight: 600,
  letterSpacing: "-0.012em",
  lineHeight: 1.15,
  marginBottom: 6,
  color: "#1d1d1f",
};

const subStyle: React.CSSProperties = {
  fontFamily: FONT_STACK,
  fontSize: 15,
  color: "rgba(29, 29, 31, 0.6)",
  marginBottom: 24,
  letterSpacing: "-0.016em",
  lineHeight: 1.4,
};

const fieldRow: React.CSSProperties = {
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: FONT_STACK,
  fontSize: 13,
  color: "rgba(29, 29, 31, 0.55)",
  marginBottom: 6,
  letterSpacing: "-0.014em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#ffffff",
  border: "1px solid rgba(29, 29, 31, 0.10)",
  borderRadius: 12,
  color: "#1d1d1f",
  fontFamily: FONT_STACK,
  fontSize: 17,
  letterSpacing: "-0.022em",
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: "13px 22px",
  background: "#7B6DC8",
  color: "#ffffff",
  border: 0,
  borderRadius: 980,
  fontFamily: FONT_STACK,
  fontSize: 17,
  fontWeight: 400,
  letterSpacing: "-0.022em",
  cursor: "pointer",
  transition: "background 160ms ease, transform 100ms ease",
};
