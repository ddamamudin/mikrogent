"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";
import type { SessionPayload } from "@/lib/session";


const NAV = [
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
];

const PUBLIC_PATHS = ["/admin/masuk", "/admin/setup"];

export default function AdminShell({
  session,
  adminLevel,
  children,
}: {
  session: SessionPayload | null;
  adminLevel?: "SUPER" | "VALIDATOR" | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isValidator = adminLevel === "VALIDATOR";

  // VALIDATOR: cuma boleh akses dashboard & tenant (router/log/pengaturan hidden)
  const visibleNav = isValidator
    ? NAV.filter((n) => n.href === "/admin/dashboard" || n.href === "/admin/tenant")
    : NAV;

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/masuk";
  };

  if (isPublicPage || !session || session.role !== "ADMIN") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="2" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="14" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-7 w-auto" />
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <InstallButton />
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 transition"
            title="Keluar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-56" : "w-0"} transition-all duration-200 overflow-hidden shrink-0 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-white/10 flex flex-col`}>
          <nav className="flex-1 py-4 px-2 space-y-1">
            {visibleNav.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
              return (
                <a
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                      : "text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </a>
              );
            })}
          </nav>
          <div className="px-3 py-3 border-t border-gray-200 dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-white/30">Super Admin</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
