"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Lease = {
  id: string;
  address: string;
  macAddress: string;
  server: string;
  status: string;
  dynamic: boolean;
  disabled: boolean;
  hostName: string;
  clientId: string;
  comment: string;
  lastSeen: string;
  expiresAfter: string;
};

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white";

const STATUS_TONE: Record<string, { bg: string; text: string }> = {
  bound: { bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-700 dark:text-green-400" },
  waiting: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
  offered: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400" },
};

export default function DhcpLeasePanel({ routerId }: { routerId: string }) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Lease | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/dhcp-leases`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setLeases([]); }
      else setLeases((json.data?.leases ?? []) as Lease[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchData(); });
    return () => { cancelled = true; };
  }, [fetchData]);

  const visible = leases.filter((l) => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(l.address.toLowerCase().includes(q) ||
        l.macAddress.toLowerCase().includes(q) ||
        l.hostName.toLowerCase().includes(q) ||
        l.comment.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/dhcp-leases/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Lease dihapus");
    fetchData();
  };

  const statusOptions = Array.from(new Set(leases.map((l) => l.status).filter(Boolean)));

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>DHCP Lease</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{leases.length !== visible.length ? `/${leases.length}` : ""})</span>
          </h2>
          <button onClick={fetchData} className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari IP / MAC / hostname / comment..." className={inputClass} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass}>
              <option value="">Semua Status</option>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading && leases.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada lease.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">IP</th>
                  <th className="text-left px-4 py-2 font-semibold">MAC</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Hostname</th>
                  <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">Server</th>
                  <th className="text-right px-4 py-2 font-semibold hidden lg:table-cell">Expires In</th>
                  <th className="text-left px-4 py-2 font-semibold hidden xl:table-cell">Type</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((l) => {
                  const isBusy = busyId === l.id;
                  const t = STATUS_TONE[l.status] ?? STATUS_TONE.waiting;
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${t.bg} ${t.text}`}>
                          {l.status || "?"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{l.address}</td>
                      <td className="px-4 py-2 font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{l.macAddress}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden md:table-cell max-w-[150px] truncate" title={l.hostName}>{l.hostName || "-"}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden lg:table-cell whitespace-nowrap">{l.server || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden lg:table-cell whitespace-nowrap">{l.expiresAfter || "-"}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden xl:table-cell whitespace-nowrap">{l.dynamic ? "Dynamic" : "Static"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setPendingDelete(l)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">
                          Hapus
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
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus lease "${pendingDelete.address}"?` : ""}
        description="Kalau lease dynamic, RouterOS akan bikin baru saat client renew. Untuk static lease, akan permanently dihapus."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
