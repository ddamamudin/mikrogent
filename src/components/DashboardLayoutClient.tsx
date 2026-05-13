"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

const NAV = [
  {
    group: "Replay Agent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M9 8h.01M15 8h.01M9 12h6" />
      </svg>
    ),
    items: [
      { href: "/dashboard/agent", label: "MikroTik Agent" },
    ],
  },
  {
    group: "Router",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="14" width="20" height="8" rx="2" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
        <line x1="10" y1="18" x2="10.01" y2="18" />
        <path d="M6 10V6a6 6 0 0 1 12 0v4" />
      </svg>
    ),
    items: [
      { href: "/dashboard/router", label: "Setting Router" },
    ],
  },
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

export type AgentSidebarState = {
  hasAnyConnected: boolean;
  totalRouters: number;
  connectedCount: number;
  activeRouterName: string | null;
  chatCount: number;
  dailyChatLimit: number;
  voiceCallEnabled: boolean;
  voiceSecondsUsed: number;
  voiceDailyLimitSeconds: number;
  hasMessages: boolean;
  onReset: () => void;
};

const AgentSidebarCtx = createContext<{
  state: AgentSidebarState | null;
  setState: (s: AgentSidebarState | null) => void;
}>({ state: null, setState: () => {} });

export function useAgentSidebar() {
  return useContext(AgentSidebarCtx);
}

export default function DashboardLayoutClient({ user, showBrandField, children }: { user: User; showBrandField: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const isAgentPage = pathname === "/dashboard/agent";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({ "Replay Agent": true, "Router": true, "Profil": true });
  const [agentState, setAgentState] = useState<AgentSidebarState | null>(null);

  // Close sidebar on route change for cleaner mobile UX
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const sidebarBase = "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-white/10 flex flex-col w-56";
  const sidebarPos = `fixed top-14 bottom-0 left-0 z-30 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`;

  return (
    <AgentSidebarCtx.Provider value={{ state: agentState, setState: setAgentState }}>
      <div className={`fixed inset-0 flex flex-col ${isAgentPage ? "bg-white" : "bg-gray-100"} dark:bg-slate-950 text-gray-900 dark:text-white`}>
        {/* Header */}
        <header className="h-14 bg-white dark:bg-slate-900 flex items-center justify-between px-4 shrink-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
              aria-label="Toggle sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect y="2" width="18" height="2" rx="1" fill="currentColor" />
                <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
                <rect y="14" width="11" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
            <a href="/dashboard/agent" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-7 w-auto" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton />
            <span className="text-sm text-gray-500 dark:text-white/60 hidden sm:block">{user.name}</span>
            {isAgentPage && (
              <button
                onClick={() => agentState?.onReset?.()}
                disabled={!agentState?.hasMessages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:text-white/60"
                title="Chat baru"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 relative">
          {/* Backdrop saat sidebar terbuka */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 top-14 z-20 bg-black/30"
              aria-hidden="true"
            />
          )}

          {/* Sidebar (overlay, ga menggeser konten) */}
          <aside className={`${sidebarBase} ${sidebarPos}`}>
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
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

                      {/* Info agent: status router, kuota, tombol chat baru */}
                      {group === "Replay Agent" && agentState && (
                        <div className="mt-2 mx-1 px-3 py-2.5 bg-gray-50 dark:bg-white/5 rounded-lg space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${agentState.hasAnyConnected ? "bg-green-500" : "bg-yellow-500"}`} />
                            <span className="text-gray-600 dark:text-white/60">
                              {agentState.totalRouters === 0
                                ? "Belum ada router"
                                : agentState.hasAnyConnected
                                  ? `${agentState.connectedCount}/${agentState.totalRouters} router terhubung`
                                  : `${agentState.totalRouters} router, belum terhubung`}
                            </span>
                          </div>
                          {agentState.activeRouterName && (
                            <div className="text-xs text-gray-500 dark:text-white/40 truncate">
                              Aktif: <strong className="text-gray-700 dark:text-white/70">{agentState.activeRouterName}</strong>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-white/40">
                            {agentState.chatCount}/{agentState.dailyChatLimit} chat hari ini
                          </div>
                          {agentState.voiceCallEnabled && (
                            <div className="text-xs text-gray-500 dark:text-white/40">
                              {agentState.voiceSecondsUsed}/{agentState.voiceDailyLimitSeconds} detik voice hari ini
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

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

            <div className="px-3 py-3 border-t border-gray-200 dark:border-white/10 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Keluar</span>
              </button>
              {showBrandField && user.brand && <p className="text-xs text-gray-400 dark:text-white/30 truncate px-1">{user.brand}.{APP_DOMAIN}</p>}
            </div>
          </aside>

          {/* Main Content - selalu full lebar */}
          <main className={`h-full ${isAgentPage ? "" : "overflow-y-auto p-6"}`}>
            {isAgentPage ? children : <div className="max-w-lg mx-auto">{children}</div>}
          </main>
        </div>
      </div>
    </AgentSidebarCtx.Provider>
  );
}
