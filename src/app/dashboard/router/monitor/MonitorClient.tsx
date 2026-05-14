"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RouterStatus from "./RouterStatus";
import HotspotUserPanel from "./panels/HotspotUserPanel";
import HotspotProfilePanel from "./panels/HotspotProfilePanel";
import HotspotActivePanel from "./panels/HotspotActivePanel";
import VoucherPanel from "./panels/VoucherPanel";

type RouterTab = {
  id: string;
  name: string;
  host: string;
  apiEnabled: boolean;
  apiPort: number;
  connected: boolean;
};

type MenuKey = "status" | "users" | "profiles" | "active" | "voucher";

const MENU: { key: MenuKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "status", label: "Status",
    icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l3 9 6-18 3 9h4"/></svg>),
  },
  {
    key: "users", label: "Hotspot User",
    icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  },
  {
    key: "profiles", label: "User Profile",
    icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  },
  {
    key: "active", label: "Active User",
    icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>),
  },
  {
    key: "voucher", label: "Generate Voucher",
    icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>),
  },
];

export default function MonitorClient({ initialRouters }: { initialRouters: RouterTab[] }) {
  const [routers, setRouters] = useState<RouterTab[]>(initialRouters);
  const [activeId, setActiveId] = useState<string | null>(initialRouters[0]?.id ?? null);
  const [menu, setMenu] = useState<MenuKey>("status");

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
      <div className="space-y-4 max-w-7xl">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Monitor Router</h1>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-5 py-8 text-center text-sm text-gray-500 dark:text-white/40 shadow-sm">
          Belum ada router. Tambahkan di <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link> dulu.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Monitor Router</h1>
        <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
          Kelola router via RouterOS API. Aktifkan API dulu di{" "}
          <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link>{" "}
          buat router yang masih non-aktif.
        </p>
      </div>

      {/* Card picker router */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {routers.map((r) => {
          const isActive = r.id === activeId;
          return (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={`text-left rounded-xl border px-3 py-2.5 transition shadow-sm ${
                isActive
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-500/10 ring-2 ring-blue-500/20"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.apiEnabled ? "bg-indigo-500" : "bg-gray-400"}`} />
                <p className={`text-sm font-semibold truncate ${
                  isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"
                }`}>
                  {r.name}
                </p>
              </div>
              <p className="text-[11px] font-mono text-gray-400 dark:text-white/30 truncate pl-3.5">
                {r.host}
              </p>
            </button>
          );
        })}
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
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sub-sidebar in-page */}
          <aside className="lg:w-52 shrink-0">
            <nav className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {MENU.map((m) => {
                const isOn = menu === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMenu(m.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      isOn
                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {menu === "status" && <RouterStatus key={`status-${active.id}`} routerId={active.id} routerName={active.name} />}
            {menu === "users" && <HotspotUserPanel key={`users-${active.id}`} routerId={active.id} />}
            {menu === "profiles" && <HotspotProfilePanel key={`profiles-${active.id}`} routerId={active.id} />}
            {menu === "active" && <HotspotActivePanel key={`active-${active.id}`} routerId={active.id} />}
            {menu === "voucher" && <VoucherPanel key={`voucher-${active.id}`} routerId={active.id} />}
          </div>
        </div>
      )}
    </div>
  );
}
