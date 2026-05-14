"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";
import NotificationBell from "@/components/NotificationBell";
import InboxDropdown from "@/components/InboxDropdown";
import type { SessionPayload } from "@/lib/session";

const NAV_GROUPS = [
  {
    label: "Operasional",
    items: [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
      },
      {
        href: "/admin/tenant",
        label: "Tenant",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        href: "/admin/users",
        label: "Tambah User",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        href: "/admin/router",
        label: "Router",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
            <line x1="10" y1="18" x2="10.01" y2="18" />
            <path d="M6 10V6a6 6 0 0 1 12 0v4" />
          </svg>
        ),
      },
      {
        href: "/admin/log",
        label: "Log Aktivitas",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        href: "/admin/pengaturan",
        label: "Pengaturan",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

// Menu khusus role ADMIN. Superadmin gak butuh panduan (dia yang bikin sistemnya),
// operator gak punya akses fitur yang dijelasin di halaman bantuan.
const BANTUAN_ITEM = {
  href: "/admin/bantuan",
  label: "Bantuan",
  icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/tenant": "Tenant",
  "/admin/users": "Tambah User",
  "/admin/router": "Router",
  "/admin/log": "Log Aktivitas",
  "/admin/pengaturan": "Pengaturan",
  "/admin/bantuan": "Bantuan",
  "/admin/inbox": "Inbox",
};

type AdminLevel = "SUPER" | "ADMIN" | "OPERATOR";

// Tentukan menu yang dilihat per role.
// Operator: cuma Dashboard + Tenant.
// Admin & Super: full menu (Admin gak boleh akses Router page sama sekali? Tidak — boleh view limited, cek diskusi spec).
function navForLevel(level: AdminLevel) {
  if (level === "OPERATOR") {
    return [
      {
        label: "Operasional",
        items: NAV_GROUPS[0].items.filter((i) =>
          ["/admin/dashboard", "/admin/tenant"].includes(i.href),
        ),
      },
    ];
  }
  if (level === "ADMIN") {
    return [
      NAV_GROUPS[0],
      {
        label: "Sistem",
        items: [...NAV_GROUPS[1].items, BANTUAN_ITEM],
      },
    ];
  }
  return NAV_GROUPS;
}

const ROLE_BADGES: Record<AdminLevel, { label: string; bg: string; text: string }> = {
  SUPER: { label: "Superadmin", bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
  ADMIN: { label: "Admin", bg: "bg-purple-100 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400" },
  OPERATOR: { label: "Operator", bg: "bg-green-100 dark:bg-green-500/20", text: "text-green-700 dark:text-green-400" },
};

function getPageTitle(pathname: string): string {
  let best = "";
  for (const key of Object.keys(PAGE_TITLES)) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      if (key.length > best.length) best = key;
    }
  }
  return PAGE_TITLES[best] ?? "Admin";
}

function getInitials(name: string | undefined): string {
  if (!name) return "S";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminShell({
  session,
  adminName,
  adminEmail,
  adminLevel,
  children,
}: {
  session: SessionPayload | null;
  adminName?: string;
  adminEmail?: string;
  adminLevel?: AdminLevel;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin:sidebarCollapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin:sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/masuk";
  };

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  };

  if (!session || session.role !== "ADMIN") {
    return <>{children}</>;
  }

  const pageTitle = getPageTitle(pathname);
  const initials = getInitials(adminName);
  const level: AdminLevel = adminLevel ?? "SUPER";
  const navGroups = navForLevel(level);
  const badge = ROLE_BADGES[level];
  const isOperator = level === "OPERATOR";

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-white">
      <header className="sticky top-0 h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-3 sm:px-4 shrink-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white shrink-0"
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="2" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="14" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-7 w-auto hidden sm:block shrink-0" />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} hidden sm:inline shrink-0 uppercase tracking-wider`}>{badge.label}</span>
          <div className="h-5 w-px bg-gray-200 dark:bg-white/10 hidden sm:block mx-1 shrink-0" />
          <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <InboxDropdown />
          <NotificationBell />
          <InstallButton />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="fixed inset-0 top-14 bg-black/40 z-20 lg:hidden"
          />
        )}

        <aside
          className={`fixed lg:relative top-14 lg:top-0 left-0 bottom-0 lg:bottom-auto z-30 lg:z-auto ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 ${
            collapsed ? "lg:w-16" : "lg:w-60"
          } w-60 shrink-0 transition-all duration-200 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-white/10 flex flex-col`}
        >
          <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">
                    {group.label}
                  </p>
                )}
                {collapsed && <div className="border-t border-gray-100 dark:border-white/5 mx-2 mb-1" />}
                {group.items.map(({ href, label, icon }) => {
                  const active =
                    pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
                  return (
                    <a
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        active
                          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                          : "text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <span className="shrink-0">{icon}</span>
                      {!collapsed && <span className="truncate">{label}</span>}
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Profile footer */}
          <div className="border-t border-gray-200 dark:border-white/10 p-2 relative">
            {profileOpen && !collapsed && (
              <>
                <button
                  onClick={() => setProfileOpen(false)}
                  className="fixed inset-0 z-0"
                  aria-label="Tutup menu profil"
                />
                <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-10">
                  {!isOperator && (
                    <a
                      href="/admin/pengaturan"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Pengaturan akun
                    </a>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Keluar
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => (collapsed ? handleLogout() : setProfileOpen((o) => !o))}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? `${adminName ?? "Admin"} — Klik untuk keluar` : undefined}
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {initials}
              </span>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {adminName ?? "Admin"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-white/40 truncate">
                      {adminEmail ?? ""}
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-gray-400 dark:text-white/30 shrink-0 transition-transform ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
