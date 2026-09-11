"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "no-session";

export default function SetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase email links arrive either as a URL fragment carrying the tokens
  // (#access_token=...) or as a ?code= to exchange. Establish the session
  // explicitly on mount rather than relying on implicit detection, then clean
  // the tokens out of the address bar.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      try {
        const hash =
          typeof window !== "undefined" && window.location.hash
            ? window.location.hash.slice(1)
            : "";
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          const code = new URLSearchParams(window.location.search).get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            window.history.replaceState({}, "", window.location.pathname);
          }
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setPhase(data.session ? "ready" : "no-session");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase("no-session");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
    const { error } = await supabase.auth.updateUser({ password, data: { needs_password_change: false } });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = "/";
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-text)",
    fontSize: 13,
    color: "var(--color-ink-48)",
    marginBottom: 6,
    letterSpacing: "-0.014em",
  };

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
          <img src="/assets/lfl-logo.png" alt="Labor Force Link" className="lfl-login-logo" />
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
            Set your password
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

        {phase === "checking" && (
          <p
            style={{
              fontFamily: "var(--font-text)",
              fontSize: 14,
              color: "var(--color-ink-48)",
              textAlign: "center",
            }}
          >
            Checking your link…
          </p>
        )}

        {phase === "no-session" && (
          <div>
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
                marginBottom: 16,
              }}
            >
              This link is expired or has already been used.
              {error ? ` (${error})` : ""}
            </div>
            <a
              href="/login"
              className="btn-primary"
              style={{
                width: "100%",
                padding: "13px 22px",
                display: "block",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Back to sign in
            </a>
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={save} className="space-y-4">
            <div>
              <label style={labelStyle}>New password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="em-input-square"
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? "Saving…" : "Save password and sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
