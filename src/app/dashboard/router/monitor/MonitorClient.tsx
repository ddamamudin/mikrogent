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
          Status realtime tiap router via RouterOS API. Aktifkan API dulu di{" "}
          <Link href="/dashboard/router" className="text-blue-500 hover:underline">halaman Router</Link>{" "}
          buat router yang masih non-aktif.
        </p>
      </div>

      {/* Card picker: di desktop berjejer horizontal (max 5 kolom),
          di tablet 3 kolom, di mobile 2 kolom, auto-wrap turun ke baris berikutnya. */}
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
