"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark";

function getInitial(): Mode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    setMode(getInitial());
    document.documentElement.classList.add("theme-ready");
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("em-theme", next);
    } catch {}
  }

  const isDark = mode === "dark";

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
    </button>
  );
}
