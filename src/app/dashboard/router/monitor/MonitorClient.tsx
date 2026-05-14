"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RouterStatus from "./RouterStatus";
import HotspotUserPanel from "./panels/HotspotUserPanel";
import HotspotProfilePanel from "./panels/HotspotProfilePanel";
import HotspotActivePanel from "./panels/HotspotActivePanel";
import VoucherPanel from "./panels/VoucherPanel";
import HostsPanel from "./panels/HostsPanel";
import IpBindingPanel from "./panels/IpBindingPanel";
import DhcpLeasePanel from "./panels/DhcpLeasePanel";
import CookiePanel from "./panels/CookiePanel";

type RouterTab = {
  id: string;
  name: string;
  host: string;
  apiEnabled: boolean;
  apiPort: number;
  connected: boolean;
};

type MenuKey = "status" | "users" | "profiles" | "active" | "hosts" | "bindings" | "leases" | "cookies" | "voucher";

type MenuItem = { key: MenuKey; label: string; icon: React.ReactNode };
type MenuSection = { label: string; items: MenuItem[] };

// Sidebar ala mikhmon — grouped by section dengan icon Font-Awesome-ish.
// Section uppercase kecil di atas, items di bawah. Tier 1 implemented; sisa
// menu mikhmon (Hosts, IP Bindings, Cookies, Log, System, Report) di-tunda.
const SECTIONS: MenuSection[] = [
  {
    label: "DASHBOARD",
    items: [
      {
        key: "status", label: "Status Router",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3 9 6-18 3 9h4"/></svg>,
      },
    ],
  },
  {
    label: "HOTSPOT",
    items: [
      {
        key: "users", label: "User List",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      },
      {
        key: "profiles", label: "User Profile",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
      },
      {
        key: "active", label: "User Aktif",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
      },
      {
        key: "hosts", label: "Hosts",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
      },
      {
        key: "bindings", label: "IP Binding",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><path d="M2 7l10 5 10-5z"/></svg>,
      },
      {
        key: "leases", label: "DHCP Lease",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
      },
      {
        key: "cookies", label: "Cookie",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c.83 0 1.64.11 2.4.32"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="16" cy="9" r="1"/></svg>,
      },
    ],
  },
  {
    label: "VOUCHER",
    items: [
      {
        key: "voucher", label: "Generate Voucher",
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
      },
    ],
  },
];

const SOON_SECTIONS: MenuSection[] = [
  {
    label: "SEGERA",
    items: [
      { key: "users", label: "Quick Print Voucher", icon: <SoonIcon /> },
      { key: "users", label: "PPP Secret", icon: <SoonIcon /> },
      { key: "users", label: "PPP Profile", icon: <SoonIcon /> },
      { key: "users", label: "PPP Active", icon: <SoonIcon /> },
      { key: "users", label: "Hotspot Log", icon: <SoonIcon /> },
      { key: "users", label: "Report Selling", icon: <SoonIcon /> },
    ],
  },
];

function SoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

export default function MonitorClient({ initialRouters }: { initialRouters: RouterTab[] }) {
  const [routers, setRouters] = useState<RouterTab[]>(initialRouters);
  const [activeId, setActiveId] = useState<string | null>(initialRouters[0]?.id ?? null);
  const [menu, setMenu] = useState<MenuKey>("status");
  const [pickerOpen, setPickerOpen] = useState(false);
  // Default closed (sama pattern dengan sidebar utama dashboard).
  // Open via hamburger → overlay slide-in, gak nge-geser content.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/account/router", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.routers)) {
        const next: RouterTab[] = data.routers.map((r: RouterTab) => ({
          id: r.id,
          name: r.name,
          host: r.host,
          apiEnabled: r.apiEnabled,
          apiPort: r.apiPort,
          connected: r.connected,
        }));
        setRouters(next);
        setActiveId((cur) => (cur && next.some((r) => r.id === cur) ? cur : next[0]?.id ?? null));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("user.router_changed", () => { refetch(); });
    return () => { es.close(); };
  }, [refetch]);

  const active = routers.find((r) => r.id === activeId) ?? null;

  if (routers.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-5 py-8 text-center text-sm text-gray-500 dark:text-white/40 shadow-sm">
        Belum ada router. Tambahkan di <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link> dulu.
      </div>
    );
  }

  // Cari label menu aktif buat tampil di header (mirip "page title" mini)
  const activeMenuLabel =
    SECTIONS.flatMap((s) => s.items).find((i) => i.key === menu)?.label ?? "Status Router";

  return (
    <div className="space-y-3">
      {/* Sub-header Monitor: hamburger toggle sidebar + breadcrumb mini */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm px-3 py-2 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle menu Monitor"
          title={sidebarOpen ? "Tutup menu" : "Buka menu"}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition text-gray-700 dark:text-white/70"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-semibold text-gray-900 dark:text-white">Monitor</span>
          <span className="text-gray-300 dark:text-white/20">/</span>
          {active && (
            <>
              <span className="text-gray-700 dark:text-white/70 truncate flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active.apiEnabled ? "bg-indigo-500" : "bg-gray-400"}`} />
                {active.name}
              </span>
              <span className="text-gray-300 dark:text-white/20 hidden sm:inline">/</span>
            </>
          )}
          <span className="text-gray-500 dark:text-white/50 truncate hidden sm:inline">{activeMenuLabel}</span>
        </div>
      </div>

      {active && !active.apiEnabled && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-500/30 px-5 py-8 text-center space-y-2 shadow-sm">
          <p className="text-sm text-gray-700 dark:text-white/70">
            <strong>{active.name}</strong> belum mengaktifkan RouterOS API.
          </p>
          <p className="text-xs text-gray-500 dark:text-white/40">
            Buka <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link>,
            lalu klik tombol <strong>Aktifkan API</strong> pada router ini.
          </p>
        </div>
      )}

      {active && active.apiEnabled && (
        <div className="relative">
          {/* Backdrop saat sidebar open — click outside untuk close. Sama
              pattern kayak sidebar utama dashboard. */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
              className="absolute inset-0 z-20 bg-black/20"
            />
          )}

          {/* Sub-sidebar floating overlay — slide-in dari kiri, gak nge-geser
              content. Default closed; toggle pakai hamburger di sub-header. */}
          <aside
            className={`absolute top-0 left-0 w-56 z-30 space-y-2 transition-transform duration-200 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
            }`}
          >
            {/* Picker card terpisah biar dropdown bisa nge-overlay nav card di bawahnya
                tanpa kena clip overflow-hidden. */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
              <div className="relative">
                <button
                  onClick={() => setPickerOpen((o) => !o)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-start gap-2 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">Router aktif</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active.apiEnabled ? "bg-indigo-500" : "bg-gray-400"}`} />
                      {active.name}
                    </p>
                    <p className="text-[11px] font-mono text-gray-400 dark:text-white/30 truncate">{active.host}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 dark:text-white/30 shrink-0 mt-1 transition-transform ${pickerOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} aria-hidden="true" />
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                      <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold border-b border-gray-100 dark:border-white/5">
                        {routers.length} router
                      </p>
                      <div className="max-h-72 overflow-y-auto py-1">
                        {routers.map((r) => {
                          const isActive = r.id === activeId;
                          return (
                            <button
                              key={r.id}
                              onClick={() => { setActiveId(r.id); setPickerOpen(false); }}
                              className={`w-full text-left px-3 py-2 transition flex items-start gap-2 ${
                                isActive
                                  ? "bg-blue-50 dark:bg-blue-500/10"
                                  : "hover:bg-gray-50 dark:hover:bg-white/5"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${r.apiEnabled ? "bg-indigo-500" : "bg-gray-400"}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"
                                }`}>{r.name}</p>
                                <p className="text-[11px] font-mono text-gray-400 dark:text-white/30 truncate">{r.host}</p>
                              </div>
                              {isActive && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400 shrink-0 mt-1">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Nav card terpisah dari picker */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
              <nav className="p-2 flex flex-col">
                {SECTIONS.map((sec) => (
                  <div key={sec.label} className="mb-1">
                    <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                      {sec.label}
                    </p>
                    {sec.items.map((it) => {
                      const isOn = menu === it.key;
                      return (
                        <button
                          key={`${sec.label}-${it.key}`}
                          onClick={() => { setMenu(it.key); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                            isOn
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="shrink-0">{it.icon}</span>
                          <span className="text-left flex-1 truncate">{it.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* Coming soon section — visual placeholder buat Tier 2/3 */}
                {SOON_SECTIONS.map((sec) => (
                  <div key={sec.label} className="mb-1 mt-2 border-t border-gray-100 dark:border-white/5 pt-2">
                    <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                      {sec.label}
                    </p>
                    {sec.items.map((it, idx) => (
                      <div
                        key={`soon-${sec.label}-${idx}`}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 dark:text-white/20 cursor-not-allowed select-none"
                        title="Belum tersedia, masih dalam pengembangan"
                      >
                        <span className="shrink-0">{it.icon}</span>
                        <span className="text-left flex-1 truncate">{it.label}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content area — selalu full width, gak nge-geser saat sidebar
              di-toggle (overlay behavior). */}
          <div className="w-full min-w-0">
            {menu === "status" && <RouterStatus key={`status-${active.id}`} routerId={active.id} routerName={active.name} />}
            {menu === "users" && <HotspotUserPanel key={`users-${active.id}`} routerId={active.id} />}
            {menu === "profiles" && <HotspotProfilePanel key={`profiles-${active.id}`} routerId={active.id} />}
            {menu === "active" && <HotspotActivePanel key={`active-${active.id}`} routerId={active.id} />}
            {menu === "hosts" && <HostsPanel key={`hosts-${active.id}`} routerId={active.id} />}
            {menu === "bindings" && <IpBindingPanel key={`bindings-${active.id}`} routerId={active.id} />}
            {menu === "leases" && <DhcpLeasePanel key={`leases-${active.id}`} routerId={active.id} />}
            {menu === "cookies" && <CookiePanel key={`cookies-${active.id}`} routerId={active.id} />}
            {menu === "voucher" && <VoucherPanel key={`voucher-${active.id}`} routerId={active.id} />}
          </div>
        </div>
      )}
    </div>
  );
}
