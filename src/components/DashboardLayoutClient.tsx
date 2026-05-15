"use client";

import { useState, useEffect, createContext, useContext, Suspense } from "react";
import { usePathname } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";
import MasukanSidebarLink from "@/components/MasukanSidebarLink";
import SessionsListSidebar from "@/components/SessionsListSidebar";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "lintasagent.com";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const AGENT_NAV: NavItem[] = [
  {
    href: "/dashboard/agent",
    label: "LintasAgent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M9 8h.01M15 8h.01M9 12h6" />
      </svg>
    ),
  },
];

const ROUTER_NAV: NavItem[] = [
  {
    href: "/dashboard/router",
    label: "Router",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="6" rx="2" />
        <rect x="2" y="14" width="20" height="6" rx="2" />
        <line x1="6" y1="7" x2="6.01" y2="7" />
        <line x1="6" y1="17" x2="6.01" y2="17" />
      </svg>
    ),
  },
  {
    href: "/dashboard/router/monitor",
    label: "Monitor",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M6 8l3 3 3-3 3 3 3-3" />
      </svg>
    ),
  },
];

const NAV: NavItem[] = [...AGENT_NAV, ...ROUTER_NAV];

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type User = { name: string; brand: string | null; email: string };

// Sekarang state cuma dipakai header buat tombol "Chat baru" — info kuota & status
// router udah dipindah ke halaman masing-masing (Router page & Profil page).
export type AgentSidebarState = {
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

// Context buat ngasih akses ke sidebar utama dashboard dari page yang
// bikin layout-nya sendiri (mis. Monitor page yang ganti header utama).
// Tombol "kembali" di Monitor header pakai ini buat buka sidebar nav utama.
export const DashboardSidebarCtx = createContext<{ setOpen: (open: boolean) => void; toggle: () => void }>(
  { setOpen: () => {}, toggle: () => {} },
);
export function useDashboardSidebar() {
  return useContext(DashboardSidebarCtx);
}

// Routes yang butuh kanvas lebar (tabel, grid multi-card, dashboard).
// Sisanya default max-w-lg buat halaman form (Profil, Password, dll).
// "/dashboard/router" match juga subroute "/dashboard/router/monitor".
const WIDE_PATHS = ["/dashboard/router"];

export default function DashboardLayoutClient({ user, showBrandField, children }: { user: User; showBrandField: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const isAgentPage = pathname === "/dashboard/agent";
  // Monitor page handle layout-nya sendiri (header + body scroll).
  // Main header & padding di-hide supaya Monitor bisa full-screen take over.
  const isMonitorPage = pathname === "/dashboard/router/monitor";
  const isWidePage = WIDE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentSidebarState | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Close sidebar on route change for cleaner mobile UX
  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Realtime: react ke aksi admin yang mempengaruhi sesi user ini.
  // - user.unvalidated: admin batalkan validasi → reload supaya layout server
  //   render PendingValidation.
  // - user.status_changed (SUSPENDED): admin suspend → redirect ke /masuk.
  // - user.quota_changed: admin reset / ubah limit → reload supaya counter
  //   di header & AgentClient dapat angka terbaru dari server props.
  // - config.changed: admin toggle voice (atau ubah AppConfig lain) →
  //   reload supaya voiceCallEnabled prop di AgentClient ke-update.
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me&topic=public:config");
    const reload = () => window.location.reload();
    es.addEventListener("user.unvalidated", reload);
    es.addEventListener("user.quota_changed", reload);
    es.addEventListener("config.changed", reload);
    es.addEventListener("user.status_changed", async (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { status?: string };
        if (data.status === "SUSPENDED") {
          // Best-effort clear cookie before redirect supaya user gak loop balik
          // ke /dashboard sebelum server-side redirect kick in.
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          window.location.href = "/masuk?suspended=1";
          return;
        }
      } catch {}
      reload();
    });
    return () => es.close();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const sidebarBase = "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-white/10 flex flex-col w-56";
  const sidebarPos = `fixed top-14 bottom-0 left-0 z-30 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`;

  const dashboardSidebarCtxValue = {
    setOpen: setSidebarOpen,
    toggle: () => setSidebarOpen((o) => !o),
  };

  return (
    <DashboardSidebarCtx.Provider value={dashboardSidebarCtxValue}>
    <AgentSidebarCtx.Provider value={{ state: agentState, setState: setAgentState }}>
      <div className={`fixed inset-0 flex flex-col ${isAgentPage ? "bg-white" : "bg-gray-100"} dark:bg-slate-950 text-gray-900 dark:text-white`}>
        {/* Header — di-hide di Monitor karena Monitor render header sendiri */}
        {!isMonitorPage && (
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
              <img src="/lintasagent-logo-text.png" alt="LintasAgent" className="h-7 w-auto" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton />
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
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 relative">
          {/* Backdrop saat sidebar terbuka. Top offset 0 di Monitor (gak ada
              main header), top-14 di page lain (di bawah main header). */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className={`fixed inset-0 ${isMonitorPage ? "top-14" : "top-14"} z-20 bg-black/30`}
              aria-hidden="true"
            />
          )}

          {/* Sidebar (overlay, ga menggeser konten) */}
          <aside className={`${sidebarBase} ${sidebarPos}`}>
            {(() => {
              // Pilih item paling spesifik (href terpanjang) yang match pathname.
              // Cegah Router (/dashboard/router) ke-aktif saat user lagi di
              // Monitor (/dashboard/router/monitor).
              const activeHref = NAV
                .map(({ href }) => href)
                .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
                .reduce((longest, current) => (current.length > longest.length ? current : longest), "");

              const renderItem = ({ href, label, icon }: NavItem) => {
                const active = href === activeHref;
                return (
                  <a
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      active
                        ? "text-brand-orange dark:text-brand-orange bg-brand-orange-50 dark:bg-brand-orange/10"
                        : "text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0">{icon}</span>
                    <span>{label}</span>
                  </a>
                );
              };

              return (
                <>
                  {/* Top nav (fixed, gak ikut scroll) */}
                  <nav className="py-2 px-2 space-y-1 shrink-0">
                    {AGENT_NAV.map(renderItem)}

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

                  {/* Histori chat (scrollable, scrollbar disembunyikan). NB: gak ada
                      horizontal padding di sini supaya separator histori bisa full-width
                      kayak separator Masukan/Profil. Padding horizontal di-handle per-item
                      di dalam SessionsListSidebar. */}
                  <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <Suspense fallback={null}>
                      <SessionsListSidebar />
                    </Suspense>
                  </div>

                  {/* Menu Router & Monitor (di-pindah ke bawah supaya akses utama tetep LintasAgent + histori chat). */}
                  <nav className="px-2 py-2 border-t border-gray-200 dark:border-white/10 space-y-1">
                    {ROUTER_NAV.map(renderItem)}
                  </nav>

                  <div className="px-3 py-2 border-t border-gray-200 dark:border-white/10 space-y-1">
                    <MasukanSidebarLink />
                  </div>
                </>
              );
            })()}

            {/* User card footer + popup (style admin) */}
            <div className="border-t border-gray-200 dark:border-white/10 p-2 relative">
              {profileOpen && (
                <>
                  <button
                    onClick={() => setProfileOpen(false)}
                    className="fixed inset-0 z-0"
                    aria-label="Tutup menu profil"
                  />
                  <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1 z-10">
                    <a
                      href="/dashboard/profil"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profil
                    </a>
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
                onClick={() => setProfileOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-dark text-white text-xs font-semibold flex items-center justify-center shrink-0">
                  {getInitials(user.name)}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-white/40 truncate">{user.email}</p>
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
                  className={`text-gray-400 dark:text-white/30 shrink-0 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showBrandField && user.brand && <p className="text-[10px] text-gray-400 dark:text-white/30 truncate px-2 pt-1">{user.brand}.{APP_DOMAIN}</p>}
            </div>
          </aside>

          {/* Main Content. Default container max-w-lg cocok buat halaman form
              (Profil, Password, Router list, dll). Page yang butuh tabel lebar
              opt-in via WIDE_PATHS jadi max-w-7xl. Page yang handle layout
              sendiri (Agent, Monitor) skip padding & wrapper — render children
              langsung biar full control. */}
          <main className={`h-full ${
            isAgentPage || isMonitorPage ? "" : "overflow-y-auto p-6"
          }`}>
            {(isAgentPage || isMonitorPage) ? children : (
              <div className={`${isWidePage ? "max-w-7xl" : "max-w-lg"} mx-auto`}>
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    </AgentSidebarCtx.Provider>
    </DashboardSidebarCtx.Provider>
  );
}
