"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Arp = {
  id: string;
  address: string;
  macAddress: string;
  interface: string;
  dynamic: boolean;
  complete: boolean;
  invalid: boolean;
  disabled: boolean;
  comment: string;
};

export default function ArpPanel({ routerId }: { routerId: string }) {
  const [arp, setArp] = useState<Arp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Arp | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/ip/arp`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setArp([]); }
      else setArp((json.data?.arp ?? []) as Arp[]);
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

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleMakeStatic = async (entry: Arp) => {
    setBusyId(entry.id);
    const res = await fetch(`/api/account/router/${routerId}/ip/arp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "make-static", mtid: entry.id }),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Entry dijadikan static");
    fetchData();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/ip/arp/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal hapus"); return; }
    showMsg("ok", "Entry dihapus");
    fetchData();
  };

  const visible = arp.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.address.toLowerCase().includes(q) ||
      a.macAddress.toLowerCase().includes(q) ||
      a.interface.toLowerCase().includes(q) ||
      a.comment.toLowerCase().includes(q);
  });

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>ARP Table</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{arp.length !== visible.length ? `/${arp.length}` : ""})</span>
          </h2>
          <button onClick={fetchData} className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium" title="Refresh">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari IP / MAC / interface..."
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>
        {loading && arp.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Tabel ARP kosong.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Type</th>
                  <th className="text-left px-4 py-2 font-semibold">IP</th>
                  <th className="text-left px-4 py-2 font-semibold">MAC</th>
                  <th className="text-left px-4 py-2 font-semibold">Interface</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Comment</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((a) => {
                  const isBusy = busyId === a.id;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          a.invalid ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                          : a.dynamic ? "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/50"
                          : "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        }`}>
                          {a.invalid ? "INVALID" : a.dynamic ? "DYN" : "STATIC"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{a.address}</td>
                      <td className="px-4 py-2 font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{a.macAddress || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-white/70 whitespace-nowrap">{a.interface}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden md:table-cell max-w-[180px] truncate" title={a.comment}>{a.comment || "-"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          {a.dynamic && (
                            <button onClick={() => handleMakeStatic(a)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 text-blue-700 dark:text-blue-400 disabled:opacity-50">
                              Make Static
                            </button>
                          )}
                          <button onClick={() => setPendingDelete(a)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">
                            Hapus
                          </button>
                        </div>
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
        title={pendingDelete ? `Hapus ARP entry ${pendingDelete.address}?` : ""}
        description="Entry akan dihapus dari tabel ARP. Kalau dynamic, mungkin akan dibikin ulang otomatis saat host kirim packet."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
