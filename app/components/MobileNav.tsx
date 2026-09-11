"use client";

import { useEffect, useState } from "react";

// Tiny mobile-only top bar + hamburger that toggles the sidebar drawer.
// The sidebar itself is the existing <aside class="em-sidebar"> — on
// mobile it becomes position:fixed and slides in from the left when
// `data-mobile-open="true"` is set on `body`.
export function MobileNav({ title }: { title: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.setAttribute("data-mobile-open", "true");
    } else {
      document.body.removeAttribute("data-mobile-open");
    }
    return () => document.body.removeAttribute("data-mobile-open");
  }, [open]);

  // Close on route change (best effort — popstate covers back/forward)
  useEffect(() => {
    const close = () => setOpen(false);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const navigate = (e: MouseEvent) => { if ((e.target as Element).closest(".em-sidebar a")) close(); };
    window.addEventListener("popstate", close);
    document.addEventListener("keydown", key);
    document.addEventListener("click", navigate);
    return () => { window.removeEventListener("popstate", close); document.removeEventListener("keydown", key); document.removeEventListener("click", navigate); };
  }, []);

  return (
    <>
      <div className="crm-mobile-bar">
        <button
          type="button"
          className="crm-hamburger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="crm-sidebar"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
        <div className="crm-mobile-title">{title}</div>
        <div style={{ width: 40 }} />
      </div>
      {open && (
        <div
          className="crm-mobile-scrim"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
