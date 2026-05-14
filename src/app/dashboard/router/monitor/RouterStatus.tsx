"use client";

import { useEffect, useState, useCallback } from "react";

type Iface = { name: string; type?: string; running: boolean; disabled: boolean; mac?: string; rxByte?: string; txByte?: string };

type StatusData = {
  identity: string;
  resource: {
    uptime: string;
    version: string;
    boardName: string;
    cpuLoad: string;
    freeMemory: number;
    totalMemory: number;
    freeHdd: number;
    totalHdd: number;
    architecture?: string;
  };
  routerboard?: { model?: string; serialNumber?: string; firmwareType?: string };
  interfaces: Iface[];
  counts: { hotspotActive: number; pppActive: number; dhcpLeasesBound: number };
  fetchedAt: string;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${units[i]}`;
}

function pct(free: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round(((total - free) / total) * 100)));
}

export default function RouterStatus({ routerId, routerName }: { routerId: string; routerName: string }) {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/account/router/${routerId}/status`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Gagal mengambil status");
        setData(null);
      } else {
        setData(json.status);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => {
    let cancelled = false;
    // Skip fetch saat tab gak visible — hemat request + RouterOS load.
    // Tab inactive bisa berjam-jam, sayang kalau tetep ping tiap 5 detik.
    const tick = () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      void fetchStatus();
    };
    // Defer first tick ke microtask supaya effect body gak nge-trigger setState
    // synchronously (rule: react-hooks/set-state-in-effect).
    queueMicrotask(tick);
    const t = setInterval(tick, 5000);
    // Pas tab balik visible, fetch langsung biar data fresh tanpa nunggu interval.
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchStatus]);

  if (loading && !data) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-5 py-8 text-center text-sm text-gray-500 dark:text-white/40 shadow-sm">
        Mengambil status {routerName}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 px-5 py-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const memPct = pct(data.resource.freeMemory, data.resource.totalMemory);
  const hddPct = pct(data.resource.freeHdd, data.resource.totalHdd);

  const cpuNum = parseInt(data.resource.cpuLoad, 10) || 0;

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{data.identity}</h2>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 truncate">
              {data.resource.boardName}{data.routerboard?.model ? ` · ${data.routerboard.model}` : ""} · RouterOS {data.resource.version}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Resource cards — 2 / 4 kolom (mobile / desktop). Cukup lebar untuk
          "1d11h41m28s" tanpa truncate. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard tone="blue" label="UPTIME" value={data.resource.uptime} mono />
        <StatCard tone="amber" label="CPU LOAD" value={`${data.resource.cpuLoad}%`} highlight={cpuNum > 80} />
        <StatCard
          tone="green"
          label="MEMORY"
          value={`${memPct}%`}
          sub={`${formatBytes(data.resource.totalMemory - data.resource.freeMemory)} / ${formatBytes(data.resource.totalMemory)}`}
          highlight={memPct > 80}
        />
        <StatCard
          tone="cyan"
          label="STORAGE"
          value={`${hddPct}%`}
          sub={`${formatBytes(data.resource.totalHdd - data.resource.freeHdd)} / ${formatBytes(data.resource.totalHdd)}`}
          highlight={hddPct > 80}
        />
      </div>

      {/* Service counts — 3 kolom */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard tone="purple" label="HOTSPOT AKTIF" value={String(data.counts.hotspotActive)} sub="user terhubung" />
        <StatCard tone="pink" label="PPP AKTIF" value={String(data.counts.pppActive)} sub="user terhubung" />
        <StatCard tone="blue" label="DHCP LEASE" value={String(data.counts.dhcpLeasesBound)} sub="bound" />
      </div>

      {/* Interface list panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80">Interface ({data.interfaces.length})</h2>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30">
            Live · {new Date(data.fetchedAt).toLocaleTimeString("id-ID")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-left px-4 py-2 font-semibold">Nama</th>
                <th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">MAC</th>
                <th className="text-right px-4 py-2 font-semibold">RX</th>
                <th className="text-right px-4 py-2 font-semibold">TX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {data.interfaces.map((i) => (
                <tr key={i.name}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 ${
                      i.disabled ? "text-gray-400 dark:text-white/30" :
                      i.running ? "text-green-600 dark:text-green-400" :
                      "text-amber-600 dark:text-amber-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${i.disabled ? "bg-gray-400" : i.running ? "bg-green-500" : "bg-amber-500"}`} />
                      {i.disabled ? "Disabled" : i.running ? "Running" : "Down"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{i.name}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden sm:table-cell whitespace-nowrap">{i.type ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{i.mac ?? "-"}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{i.rxByte ? formatBytes(parseInt(i.rxByte, 10)) : "-"}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{i.txByte ? formatBytes(parseInt(i.txByte, 10)) : "-"}</td>
                </tr>
              ))}
              {data.interfaces.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-gray-400 dark:text-white/30">Tidak ada interface</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-white/30 text-right">
        Update tiap 5 detik (pause saat tab gak aktif)
      </p>
    </div>
  );
}

const STAT_TONES: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/40" },
  green: { bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-600 dark:text-green-400", ring: "ring-green-500/40" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/40" },
  purple: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/40" },
  cyan: { bg: "bg-cyan-50 dark:bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-500/40" },
  pink: { bg: "bg-pink-50 dark:bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", ring: "ring-pink-500/40" },
};

function StatCard({ tone, label, value, sub, mono, highlight }: { tone: string; label: string; value: string; sub?: string; mono?: boolean; highlight?: boolean }) {
  const t = STAT_TONES[tone] ?? STAT_TONES.blue;
  return (
    <div className={`${t.bg} rounded-xl p-4 ${highlight ? `ring-2 ${t.ring}` : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">{label}</p>
      <p className={`${mono ? "font-mono text-lg sm:text-xl" : "text-2xl sm:text-3xl"} font-bold mt-1.5 ${t.text} truncate`} title={value}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-gray-500 dark:text-white/40 mt-1 truncate font-mono" title={sub}>
          {sub}
        </p>
      )}
    </div>
  );
}
