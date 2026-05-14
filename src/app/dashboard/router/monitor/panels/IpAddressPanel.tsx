"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Addr = {
  id: string;
  address: string;
  network: string;
  interface: string;
  dynamic: boolean;
  invalid: boolean;
  disabled: boolean;
  comment: string;
};

type Draft = { address: string; network: string; interface: string; comment: string };

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

export default function IpAddressPanel({ routerId }: { routerId: string }) {
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Addr | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/ip/addresses`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setAddrs([]); }
      else {
        setAddrs((json.data?.addresses ?? []) as Addr[]);
        setInterfaces((json.data?.interfaces ?? []) as string[]);
      }
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

  const handleAdd = async () => {
    if (!adding) return;
    if (!adding.address.trim() || !adding.interface.trim()) {
      showMsg("err", "Address dan interface wajib");
      return;
    }
    setBusyId("__add__");
    const res = await fetch(`/api/account/router/${routerId}/ip/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adding),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    setAdding(null);
    showMsg("ok", "Address ditambahkan");
    fetchData();
  };

  const handleToggle = async (a: Addr) => {
    setBusyId(a.id);
    const res = await fetch(`/api/account/router/${routerId}/ip/addresses/${encodeURIComponent(a.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: a.disabled ? "enable" : "disable" }),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", a.disabled ? "Address dinyalakan" : "Address dimatikan");
    fetchData();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/ip/addresses/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Address dihapus");
    fetchData();
  };

  const visible = addrs.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.address.toLowerCase().includes(q) ||
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>IP Address</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{addrs.length !== visible.length ? `/${addrs.length}` : ""})</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setAdding({ address: "", network: "", interface: interfaces[0] ?? "", comment: "" })} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button onClick={fetchData} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium" title="Refresh">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari address / interface..."
            className={inputClass}
          />
        </div>
        {loading && addrs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada address.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">Address</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Network</th>
                  <th className="text-left px-4 py-2 font-semibold">Interface</th>
                  <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">Comment</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((a) => {
                  const isBusy = busyId === a.id;
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 ${a.invalid ? "text-red-600" : a.disabled ? "text-gray-400 dark:text-white/30" : a.dynamic ? "text-gray-500 dark:text-white/40" : "text-green-600 dark:text-green-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.invalid ? "bg-red-500" : a.disabled ? "bg-gray-400" : a.dynamic ? "bg-gray-400" : "bg-green-500"}`} />
                          {a.invalid ? "Invalid" : a.disabled ? "Off" : a.dynamic ? "Dyn" : "On"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{a.address}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{a.network || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-white/70 whitespace-nowrap">{a.interface}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden lg:table-cell max-w-[180px] truncate" title={a.comment}>{a.comment || "-"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {!a.dynamic && (
                          <div className="inline-flex gap-1">
                            <button onClick={() => handleToggle(a)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white/70 disabled:opacity-50">
                              {a.disabled ? "On" : "Off"}
                            </button>
                            <button onClick={() => setPendingDelete(a)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAdding(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Tambah IP Address</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-white/40">Address (IP/CIDR)</label>
                <input value={adding.address} onChange={(e) => setAdding({ ...adding, address: e.target.value })} className={inputClass} placeholder="192.168.10.1/24" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-white/40">Network (opsional)</label>
                <input value={adding.network} onChange={(e) => setAdding({ ...adding, network: e.target.value })} className={inputClass} placeholder="auto kalau kosong" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-white/40">Interface</label>
                <select value={adding.interface} onChange={(e) => setAdding({ ...adding, interface: e.target.value })} className={inputClass}>
                  {interfaces.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-white/40">Comment</label>
                <input value={adding.comment} onChange={(e) => setAdding({ ...adding, comment: e.target.value })} className={inputClass} placeholder="optional" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setAdding(null)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium">Batal</button>
              <button onClick={handleAdd} disabled={busyId === "__add__"} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium">
                {busyId === "__add__" ? "..." : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus address ${pendingDelete.address}?` : ""}
        description="Interface mungkin kehilangan IP. Pastikan ada koneksi alternatif sebelum menghapus."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
