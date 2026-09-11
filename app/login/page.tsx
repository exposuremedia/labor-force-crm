"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to sign in."); return; }
      window.location.href = result.redirectTo === "/set-password" ? "/set-password" : "/";
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
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
              Username or email
            </label>
            <input
              type="text"
              aria-label="Username or email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
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
              aria-label="Password"
              autoComplete="current-password"
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
