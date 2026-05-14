"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Cookie = {
  id: string;
  user: string;
  macAddress: string;
  domain: string;
  expiresIn: string;
};

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white";

export default function CookiePanel({ routerId }: { routerId: string }) {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Cookie | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/cookies`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setCookies([]); }
      else setCookies((json.data?.cookies ?? []) as Cookie[]);
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

  const visible = cookies.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.user.toLowerCase().includes(q) ||
      c.macAddress.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/cookies/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Cookie dihapus");
    fetchData();
  };

  const confirmDeleteAll = async () => {
    setBusyId("__all__");
    let failed = 0;
    for (const c of visible) {
      try {
        const res = await fetch(`/api/account/router/${routerId}/hotspot/cookies/${encodeURIComponent(c.id)}`, { method: "DELETE" });
        if (!res.ok) failed++;
      } catch { failed++; }
    }
    setBusyId(null);
    setPendingDeleteAll(false);
    showMsg(failed === 0 ? "ok" : "err", failed === 0 ? `${visible.length} cookie dihapus` : `${visible.length - failed} dihapus, ${failed} gagal`);
    fetchData();
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c.83 0 1.64.11 2.4.32"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="14" r="1"/><circle cx="16" cy="9" r="1"/></svg>
            <span>Hotspot Cookie</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{cookies.length !== visible.length ? `/${cookies.length}` : ""})</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            {visible.length > 0 && (
              <>
                <button onClick={() => setPendingDeleteAll(true)} className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-medium">
                  Hapus semua
                </button>
                <span className="text-gray-300 dark:text-white/10">|</span>
              </>
            )}
            <button onClick={fetchData} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <p className="text-[11px] text-gray-500 dark:text-white/40 mb-2">
            Cookie = cache login auto. Hapus cookie = paksa user login ulang pas reconnect ke hotspot.
          </p>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user / MAC / domain..." className={inputClass} />
        </div>

        {loading && cookies.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada cookie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">User</th>
                  <th className="text-left px-4 py-2 font-semibold">MAC</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Domain</th>
                  <th className="text-right px-4 py-2 font-semibold">Expires</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((c) => {
                  const isBusy = busyId === c.id;
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{c.user}</td>
                      <td className="px-4 py-2 font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{c.macAddress || "-"}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{c.domain || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 whitespace-nowrap">{c.expiresIn || "-"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => setPendingDelete(c)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">
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
        title={pendingDelete ? `Hapus cookie "${pendingDelete.user}"?` : ""}
        description={pendingDelete ? `User ${pendingDelete.user} bakal login ulang pas reconnect.` : ""}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingDeleteAll}
        variant="danger"
        title={`Hapus semua ${visible.length} cookie?`}
        description="Semua user yang lagi punya cookie akan paksa login ulang. Bisa berguna kalau ada perubahan profile atau user lupa logout."
        confirmLabel="Hapus Semua"
        cancelLabel="Batal"
        loading={busyId === "__all__"}
        onConfirm={confirmDeleteAll}
        onCancel={() => setPendingDeleteAll(false)}
      />
    </div>
  );
}
