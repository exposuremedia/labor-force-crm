"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function handle() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  return (
    <button
      onClick={handle}
      style={{
        fontFamily: "var(--font-text)",
        fontSize: 13,
        color: "rgba(255,255,255,0.7)",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.14)",
        padding: "6px 12px",
        borderRadius: 8,
        cursor: "pointer",
        letterSpacing: "-0.014em",
        transition: "background 120ms ease, color 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
      }}
    >
      Sign out
    </button>
  );
}
