"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

const NAV = [
  {
    group: "Profil",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    items: [
      { href: "/dashboard/profil", label: "Update Profil" },
      { href: "/dashboard/password", label: "Ganti Password" },
      { href: "/dashboard/hapus-akun", label: "Hapus Akun", danger: true },
    ],
  },
];

type User = { name: string; brand: string | null; email: string };

export default function DashboardLayoutClient({ user, showBrandField, children }: { user: User; showBrandField: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({ Profil: true });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="2" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="14" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500 dark:text-white/60 hidden sm:block mr-2">{user.name}</span>
          <ThemeToggle />
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
            {NAV.map(({ group, icon, items }) => (
              <div key={group}>
                <button
                  onClick={() => setGroupOpen((o) => ({ ...o, [group]: !o[group] }))}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-2">{icon}<span>{group}</span></div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${groupOpen[group] ? "rotate-180" : ""}`}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {groupOpen[group] && (
                  <div className="mt-1 ml-4 space-y-1">
                    {items.map(({ href, label, danger }) => {
                      const active = pathname === href;
                      return (
                        <a
                          key={href}
                          href={href}
                          className={`block px-3 py-1.5 rounded-lg text-sm transition ${
                            active && danger ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10"
                            : active ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                            : danger ? "text-red-500 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            : "text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
                        >
                          {label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Buka Situs */}
            {showBrandField && user.brand && (
              <a
                href={`//${user.brand}.${APP_DOMAIN}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>Buka Situs</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-40">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </nav>

          <div className="px-3 py-3 border-t border-gray-200 dark:border-white/10">
            {showBrandField && user.brand && <p className="text-xs text-gray-400 dark:text-white/30 truncate">{user.brand}.{APP_DOMAIN}</p>}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
