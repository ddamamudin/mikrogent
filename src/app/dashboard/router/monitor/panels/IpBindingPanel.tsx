"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Binding = {
  id: string;
  macAddress: string;
  address: string;
  toAddress: string;
  server: string;
  type: string;
  disabled: boolean;
  comment: string;
};

type Draft = {
  macAddress: string;
  address: string;
  type: string;
  comment: string;
};

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white";

function emptyDraft(): Draft {
  return { macAddress: "", address: "", type: "bypassed", comment: "" };
}

const TYPE_TONE: Record<string, { bg: string; text: string }> = {
  bypassed: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-400" },
  regular: { bg: "bg-gray-100 dark:bg-white/5", text: "text-gray-700 dark:text-white/70" },
  blocked: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-400" },
};

export default function IpBindingPanel({ routerId }: { routerId: string }) {
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Binding | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/bindings`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setBindings([]); }
      else setBindings((json.data?.bindings ?? []) as Binding[]);
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

  const visible = bindings.filter((b) => {
    if (filterType && b.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(b.macAddress.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.comment.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const handleAdd = async () => {
    if (!adding) return;
    if (!adding.macAddress.trim() && !adding.address.trim()) {
      showMsg("err", "MAC atau IP wajib diisi"); return;
    }
    setBusyId("__add__");
    const res = await fetch(`/api/account/router/${routerId}/hotspot/bindings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adding),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    setAdding(null);
    showMsg("ok", "IP Binding ditambahkan");
    fetchData();
  };

  const handleEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/bindings/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", fields: editing.draft }),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    setEditing(null);
    showMsg("ok", "Binding diupdate");
    fetchData();
  };

  const handleToggle = async (b: Binding) => {
    setBusyId(b.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/bindings/${encodeURIComponent(b.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: b.disabled ? "enable" : "disable" }),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", b.disabled ? "Binding di-enable" : "Binding di-disable");
    fetchData();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/bindings/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Binding dihapus");
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><path d="M2 7l10 5 10-5z"/></svg>
            <span>IP Binding</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{bindings.length !== visible.length ? `/${bindings.length}` : ""})</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setAdding(emptyDraft())} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button onClick={fetchData} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari MAC / IP / comment..." className={inputClass} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputClass}>
              <option value="">Semua Type</option>
              <option value="bypassed">bypassed</option>
              <option value="regular">regular</option>
              <option value="blocked">blocked</option>
            </select>
          </div>
        </div>

        {loading && bindings.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada binding.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">Type</th>
                  <th className="text-left px-4 py-2 font-semibold">MAC</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">IP</th>
                  <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">Comment</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((b) => {
                  const isBusy = busyId === b.id;
                  const t = TYPE_TONE[b.type] ?? TYPE_TONE.regular;
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 ${b.disabled ? "text-gray-400 dark:text-white/30" : "text-green-600 dark:text-green-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${b.disabled ? "bg-gray-400" : "bg-green-500"}`} />
                          {b.disabled ? "Off" : "On"}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${t.bg} ${t.text}`}>
                          {b.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{b.macAddress || "-"}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{b.address || "-"}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden lg:table-cell max-w-[200px] truncate" title={b.comment}>{b.comment || "-"}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button onClick={() => handleToggle(b)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white/70 disabled:opacity-50">
                            {b.disabled ? "On" : "Off"}
                          </button>
                          <button onClick={() => setEditing({ id: b.id, draft: { macAddress: b.macAddress, address: b.address, type: b.type, comment: b.comment } })} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 text-blue-700 dark:text-blue-400 disabled:opacity-50">Edit</button>
                          <button onClick={() => setPendingDelete(b)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">Hapus</button>
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

      {(adding || editing) && (
        <BindingModal
          title={adding ? "Tambah IP Binding" : `Edit ${editing!.draft.macAddress || editing!.draft.address}`}
          draft={adding ?? editing!.draft}
          onChange={(d) => adding ? setAdding(d) : setEditing({ ...editing!, draft: d! })}
          onCancel={() => { setAdding(null); setEditing(null); }}
          onSubmit={adding ? handleAdd : handleEdit}
          busy={adding ? busyId === "__add__" : busyId === editing?.id}
          submitLabel={adding ? "Tambah" : "Simpan"}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus binding "${pendingDelete.macAddress || pendingDelete.address}"?` : ""}
        description="Aksi ini gak bisa di-undo dari router."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function BindingModal({ title, draft, onChange, onCancel, onSubmit, busy, submitLabel }: {
  title: string; draft: Draft; onChange: (d: Draft) => void; onCancel: () => void; onSubmit: () => void; busy: boolean; submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div>
          <label className="text-xs text-gray-500 dark:text-white/40">MAC Address</label>
          <input value={draft.macAddress} onChange={(e) => onChange({ ...draft, macAddress: e.target.value })} className={inputClass} placeholder="AA:BB:CC:DD:EE:FF" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-white/40">IP Address</label>
          <input value={draft.address} onChange={(e) => onChange({ ...draft, address: e.target.value })} className={inputClass} placeholder="192.168.x.x (opsional)" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-white/40">Type</label>
          <select value={draft.type} onChange={(e) => onChange({ ...draft, type: e.target.value })} className={inputClass}>
            <option value="bypassed">bypassed (skip auth, langsung internet)</option>
            <option value="regular">regular (paksa login)</option>
            <option value="blocked">blocked (deny semua)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-white/40">Comment</label>
          <input value={draft.comment} onChange={(e) => onChange({ ...draft, comment: e.target.value })} className={inputClass} placeholder="opsional" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium">Batal</button>
          <button onClick={onSubmit} disabled={busy} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium">
            {busy ? "..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
