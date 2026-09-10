"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      <div
        className="surface-card"
        style={{ width: "100%", maxWidth: 420, padding: 40 }}
      >
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--color-brand)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 16,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              LFL
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.012em",
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Sign in
          </h1>
          <p
            style={{
              fontFamily: "var(--font-text)",
              fontSize: 15,
              color: "var(--color-ink-48)",
              marginTop: 6,
              letterSpacing: "-0.016em",
            }}
          >
            Labor Force Link CRM
          </p>
        </div>

        <form onSubmit={signIn} className="space-y-4">
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-text)",
                fontSize: 13,
                color: "var(--color-ink-48)",
                marginBottom: 6,
                letterSpacing: "-0.014em",
              }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="em-input-square"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--font-text)",
                fontSize: 13,
                color: "var(--color-ink-48)",
                marginBottom: 6,
                letterSpacing: "-0.014em",
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="em-input-square"
            />
          </div>

          {error && (
            <div
              style={{
                fontFamily: "var(--font-text)",
                fontSize: 14,
                background: "var(--color-hot-soft)",
                color: "var(--color-hot)",
                border: "1px solid rgba(192, 57, 43, 0.18)",
                borderRadius: 12,
                padding: "10px 14px",
                letterSpacing: "-0.014em",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "13px 22px" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p
          style={{
            marginTop: 22,
            fontFamily: "var(--font-text)",
            fontSize: 13,
            color: "var(--color-ink-48)",
            textAlign: "center",
            letterSpacing: "-0.014em",
          }}
        >
          Labor Force Link staff access.
        </p>
      </div>
    </div>
  );
}
