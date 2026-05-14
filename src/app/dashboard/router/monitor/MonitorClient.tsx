"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RouterStatus from "./RouterStatus";

type RouterTab = {
  id: string;
  name: string;
  host: string;
  apiEnabled: boolean;
  apiPort: number;
  connected: boolean;
};

export default function MonitorClient({ initialRouters }: { initialRouters: RouterTab[] }) {
  const [routers, setRouters] = useState<RouterTab[]>(initialRouters);
  const [activeId, setActiveId] = useState<string | null>(initialRouters[0]?.id ?? null);

  // Refresh list saat router/API status berubah (dari halaman Router di tab lain
  // atau via SSE event).
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
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Monitor Router</h1>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-5 py-8 text-center text-sm text-gray-500 dark:text-white/40 shadow-sm">
          Belum ada router. Tambahkan di <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link> dulu.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Monitor Router</h1>
        <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
          Status realtime tiap router via RouterOS API. Aktifkan API dulu di{" "}
          <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link>{" "}
          buat router yang masih non-aktif.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/10">
        {routers.map((r) => {
          const isActive = r.id === activeId;
          return (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap ${
                isActive
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${r.apiEnabled ? "bg-indigo-500" : "bg-gray-400"}`} />
                {r.name}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        active.apiEnabled
          ? <RouterStatus key={active.id} routerId={active.id} routerName={active.name} />
          : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-500/30 px-5 py-8 text-center space-y-2 shadow-sm">
              <p className="text-sm text-gray-700 dark:text-white/70">
                <strong>{active.name}</strong> belum mengaktifkan RouterOS API.
              </p>
              <p className="text-xs text-gray-500 dark:text-white/40">
                Buka <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link>,
                lalu klik tombol <strong>Aktifkan API</strong> pada router ini.
              </p>
            </div>
          )
      )}
    </div>
  );
}
