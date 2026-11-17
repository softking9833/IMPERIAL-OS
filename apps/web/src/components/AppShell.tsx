"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUserSummary } from "@/lib/shared-types";
import { api, getToken, setToken } from "@/lib/api";

type NavLink = {
  href: string;
  label: string;
  icon: string;
  /** If set, only these roles see the link */
  roles?: AuthUserSummary["role"][];
};

const MD: AuthUserSummary["role"][] = ["MANAGING_DIRECTOR"];

const navGroups: Array<{ label: string | null; links: NavLink[] }> = [
  {
    label: null,
    links: [{ href: "/home", label: "Home", icon: "home" }],
  },
  {
    label: "Manage",
    links: [
      { href: "/dashboard", label: "Overview", icon: "overview", roles: MD },
      { href: "/users", label: "People", icon: "people", roles: MD },
      { href: "/campaigns", label: "Campaigns", icon: "campaigns", roles: MD },
      { href: "/admin-config", label: "Admin Config", icon: "config", roles: MD },
    ],
  },
  {
    label: "Operate",
    links: [
      { href: "/learn", label: "Learn", icon: "learn" },
      { href: "/roleplay", label: "Roleplay", icon: "roleplay" },
      { href: "/field", label: "Field", icon: "field" },
      { href: "/performance", label: "Performance", icon: "performance" },
      { href: "/profile", label: "Profile", icon: "profile" },
    ],
  },
  {
    label: "Lifecycle",
    links: [
      { href: "/readiness", label: "Field Readiness", icon: "readiness", roles: MD },
      { href: "/associate", label: "Associate Loop", icon: "loop", roles: MD },
    ],
  },
];

const mdOnlyPaths = new Set(
  navGroups.flatMap((g) => g.links.filter((l) => l.roles?.includes("MANAGING_DIRECTOR")).map((l) => l.href)),
);

function canAccess(link: NavLink, role: AuthUserSummary["role"]) {
  return !link.roles || link.roles.includes(role);
}

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      );
    case "overview":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M2.8 19c.6-3 2.8-4.6 6.2-4.6s5.6 1.6 6.2 4.6" />
          <path d="M14.2 14.8c1.7-.4 3.3-.1 4.8 1.4.5.5.8 1.2 1 1.8" />
        </svg>
      );
    case "campaigns":
      return (
        <svg {...common}>
          {/* Bullhorn / megaphone */}
          <path d="M4.5 10.2h2.2L14 6.5v11l-7.3-3.7H4.5a2.2 2.2 0 0 1 0-3.6z" />
          <path d="M6.7 13.8v2.6c0 1-.8 1.8-1.8 1.8H4.2" />
          <path d="M16.2 9.2a3.6 3.6 0 0 1 0 5.6" />
          <path d="M18.6 7.4a6.4 6.4 0 0 1 0 9.2" />
        </svg>
      );
    case "config":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6M17.5 8l1.6-1.6" />
        </svg>
      );
    case "learn":
      return (
        <svg {...common}>
          <path d="M4 5.5c2.2-1 4.4-1.3 8-1.3s5.8.3 8 1.3v13c-2.2-1-4.4-1.3-8-1.3s-5.8.3-8 1.3v-13z" />
          <path d="M12 4.2v13" />
        </svg>
      );
    case "roleplay":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="11" rx="2.5" />
          <path d="M8 17.5 6.5 20.5M16 17.5l1.5 3" />
          <circle cx="9" cy="12.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "field":
      return (
        <svg {...common}>
          <path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 12 4.3a6.5 6.5 0 0 0-6.5 6.5C5.5 15.8 12 21 12 21z" />
          <circle cx="12" cy="10.8" r="2.2" />
        </svg>
      );
    case "performance":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V11M12 16V7M17 16v-4" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.3" />
          <path d="M4.5 19c.8-3.4 3.4-5.2 7.5-5.2s6.7 1.8 7.5 5.2" />
        </svg>
      );
    case "readiness":
      return (
        <svg {...common}>
          <path d="M12 3.5 5 6.2v5.3c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6.2L12 3.5z" />
          <path d="m9 12 2.1 2.1L15.5 9.7" />
        </svg>
      );
    case "loop":
      return (
        <svg {...common}>
          <path d="M4.5 12a7.5 7.5 0 0 1 12.4-5.7L19 8" />
          <path d="M19.5 4.5V8h-3.5" />
          <path d="M19.5 12a7.5 7.5 0 0 1-12.4 5.7L5 16" />
          <path d="M4.5 19.5V16H8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}

function CrownIcon() {
  return (
    <svg
      className="brand-crown"
      width="34"
      height="28"
      viewBox="0 0 34 28"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 22.5 6.5 8l6 7.5L17 4.5l4.5 11 6-7.5 3.5 14.5H3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5 22.5h24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6.5" cy="7.2" r="1.4" fill="currentColor" />
      <circle cx="17" cy="4" r="1.4" fill="currentColor" />
      <circle cx="27.5" cy="7.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSummary | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
        if (
          res.user.role !== "MANAGING_DIRECTOR" &&
          mdOnlyPaths.has(pathname)
        ) {
          router.replace("/home");
        }
      })
      .catch(() => {
        setToken(null);
        router.replace("/login");
      });
  }, [router, pathname]);

  function logout() {
    setToken(null);
    router.replace("/login");
  }

  if (!user) {
    return (
      <div className="login-page">
        <p className="muted">Loading IMPERIAL OS…</p>
      </div>
    );
  }

  if (user.role !== "MANAGING_DIRECTOR" && mdOnlyPaths.has(pathname)) {
    return (
      <div className="login-page">
        <p className="muted">Redirecting…</p>
      </div>
    );
  }

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => canAccess(link, user.role)),
    }))
    .filter((group) => group.links.length > 0);

  const initial = (user.firstName?.[0] ?? "I").toUpperCase();
  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-ornament top" aria-hidden />
        <div className="sidebar-ornament bottom" aria-hidden />

        <div className="brand">
          <CrownIcon />
          <strong>IMPERIAL OS</strong>
          <span>Built to Lead.</span>
        </div>

        <nav className="nav">
          {visibleGroups.map((group, index) => (
            <div className="nav-group" key={group.label ?? `top-${index}`}>
              {group.label ? (
                <div className="nav-group-label">
                  <span>{group.label}</span>
                </div>
              ) : null}
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname === link.href ? "active" : undefined}
                >
                  <span className="nav-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span className="sidebar-role">{user.role.replaceAll("_", " ")}</span>
              <span className="sidebar-scope">
                Scope: {user.activeScopeLabel ?? "—"}
              </span>
            </div>
          </div>
          <button className="btn-signout" onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M8 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M16 16l4-4-4-4M20 12H10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="topbar-meta">
            <div className="system-pill">
              <span className="system-dot" aria-hidden />
              System Online
            </div>
            <span className="topbar-date">{todayLabel}</span>
            <div className="topbar-bell" aria-label="Notifications" title="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 20a2 2 0 0 0 4 0"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
