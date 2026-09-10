"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-parchment)" }}
    >
      <div className="surface-card" style={{ width: "100%", maxWidth: 420, padding: 40 }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--color-brand)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              margin: "0 auto 16px",
            }}
          >
            LFL
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Set your password
          </h1>
          <p style={{ fontSize: 14, opacity: 0.6, marginTop: 6 }}>
            Choose a password for your Labor Force Link CRM account.
          </p>
        </div>

        <form onSubmit={save}>
          <label style={{ fontSize: 13, opacity: 0.7 }}>New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="em-input-square"
            style={{ width: "100%", marginTop: 6, marginBottom: 16 }}
          />

          <label style={{ fontSize: 13, opacity: 0.7 }}>Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="em-input-square"
            style={{ width: "100%", marginTop: 6, marginBottom: 20 }}
          />

          {error && (
            <div style={{ color: "var(--color-hot)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px 22px" }}>
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
