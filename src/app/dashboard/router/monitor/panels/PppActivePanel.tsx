"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Active = {
  id: string;
  name: string;
  service: string;
  callerId: string;
  address: string;
  uptime: string;
  encoding: string;
  sessionId: string;
};

export default function PppActivePanel({ routerId }: { routerId: string }) {
  const [active, setActive] = useState<Active[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingKick, setPendingKick] = useState<Active | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/ppp/active`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setActive([]); }
      else setActive((json.data?.active ?? []) as Active[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      void fetchActive();
    };
    queueMicrotask(tick);
    const t = setInterval(tick, 10000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchActive]);

  const visible = active.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) ||
      a.address.toLowerCase().includes(q) ||
      a.callerId.toLowerCase().includes(q);
  });

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const confirmKick = async () => {
    if (!pendingKick) return;
    setBusyId(pendingKick.id);
    const res = await fetch(`/api/account/router/${routerId}/ppp/active/${encodeURIComponent(pendingKick.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingKick(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal disconnect"); return; }
    showMsg("ok", "Session di-disconnect");
    fetchActive();
  };

  return (
    <div className="space-y-3">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            <span>PPP Active</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{active.length !== visible.length ? `/${active.length}` : ""})</span>
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Auto-refresh 10s
            </span>
            <button onClick={fetchActive} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium" title="Refresh">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / IP / caller-id..."
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        {loading && active.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Gak ada session PPP aktif.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold">Service</th>
                  <th className="text-left px-4 py-2 font-semibold">IP</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Caller ID</th>
                  <th className="text-right px-4 py-2 font-semibold">Uptime</th>
                  <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">Encoding</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((a) => {
                  const isBusy = busyId === a.id;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{a.name}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-white/70 uppercase whitespace-nowrap">{a.service}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 whitespace-nowrap">{a.address || "-"}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{a.callerId || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{a.uptime}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden lg:table-cell whitespace-nowrap">{a.encoding || "-"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setPendingKick(a)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">
                          Disconnect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingKick}
        variant="danger"
        title={pendingKick ? `Disconnect "${pendingKick.name}"?` : ""}
        description={pendingKick ? `Paksa logout sesi PPP (${pendingKick.address}). User bisa dial ulang nanti.` : ""}
        confirmLabel="Disconnect"
        cancelLabel="Batal"
        loading={!!pendingKick && busyId === pendingKick.id}
        onConfirm={confirmKick}
        onCancel={() => setPendingKick(null)}
      />
    </div>
  );
}
