import Link from "next/link";
import { WelcomeTour } from "./WelcomeTour";
import { SignOutButton } from "../signout-button";
import { ThemeToggle } from "./ThemeToggle";

type Item = {
  key: "contacts" | "pipeline";
  label: string;
  href: string;
};

const ITEMS: Item[] = [
  { key: "contacts", label: "Contacts", href: "/" },
  { key: "pipeline", label: "Pipeline", href: "/pipeline" },
];

export function Sidebar({
  active,
  userEmail,
  userRole,
  hotCount = 0,
}: {
  active: Item["key"];
  userEmail?: string | null;
  userRole?: string | null;
  hotCount?: number;
}) {
  return (
    <aside
      className="em-sidebar w-64 shrink-0 flex flex-col"
      style={{ padding: "20px 14px" }}
    >
      <Link
        href="/"
        className="flex items-center gap-3 group"
        style={{ padding: "8px 10px 22px 10px" }}
      >
        <img className="lfl-brand-logo" src="/assets/lfl-logo.png" alt="LaborForceLink — Connecting Skilled Crews" />
      </Link>

      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="em-sidebar-link"
            data-active={active === item.key ? "true" : undefined}
          >
            <img className="lfl-nav-icon" src={item.key === "contacts" ? "/assets/icon-worker.png" : "/assets/icon-crane.png"} alt="" />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.key === "contacts" && hotCount > 0 && (
              <span className="crm-nav-badge">{hotCount}</span>
            )}
          </Link>
        ))}

        <a
          href="https://laborforcelink.com"
          className="em-sidebar-link"
          target="_blank"
          rel="noreferrer"
        >
          Home ↗
        </a>
        {userEmail && <WelcomeTour userEmail={userEmail} />}
      </nav>

      <div className="flex-1" />

      {userEmail ? (
        <div
          style={{
            padding: "16px 12px 4px 12px",
            borderTop: "1px solid var(--color-sidebar-border)",
            marginTop: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-text)",
              fontSize: 13,
              color: "rgba(255,255,255,0.92)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "-0.014em",
            }}
          >
            {userEmail}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-sidebar-muted)",
              marginTop: 2,
              textTransform: "capitalize",
              fontFamily: "var(--font-text)",
            }}
          >
            {userRole || "member"}
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SignOutButton />
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
