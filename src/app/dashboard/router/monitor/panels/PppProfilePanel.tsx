"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Profile = {
  id: string;
  name: string;
  localAddress: string;
  remoteAddress: string;
  rateLimit: string;
  dnsServer: string;
  parentQueue: string;
  onlyOne: string;
  sessionTimeout: string;
  comment: string;
};

type Draft = Omit<Profile, "id">;

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

const ONLY_ONE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "yes", label: "Yes (anti-multi-login)" },
  { value: "no", label: "No (boleh multi-login)" },
];

function emptyDraft(): Draft {
  return {
    name: "",
    localAddress: "",
    remoteAddress: "",
    rateLimit: "",
    dnsServer: "",
    parentQueue: "",
    onlyOne: "default",
    sessionTimeout: "",
    comment: "",
  };
}

export default function PppProfilePanel({ routerId }: { routerId: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pools, setPools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [adding, setAdding] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/ppp/profiles`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Gagal");
        setProfiles([]);
      } else {
        setProfiles(json.data?.profiles ?? []);
        setPools(json.data?.pools ?? []);
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

  const handleSaveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    const res = await fetch(`/api/account/router/${routerId}/ppp/profiles/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: editing.draft }),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    setEditing(null);
    showMsg("ok", "Profile diupdate");
    fetchData();
  };

  const handleSaveAdd = async () => {
    if (!adding) return;
    if (!adding.name.trim()) { showMsg("err", "Name wajib"); return; }
    setBusyId("__add__");
    const res = await fetch(`/api/account/router/${routerId}/ppp/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adding),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    setAdding(null);
    showMsg("ok", "Profile dibikin");
    fetchData();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/ppp/profiles/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Profile dihapus");
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>PPP Profile</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({profiles.length})</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => setAdding(emptyDraft())} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Profile
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button onClick={fetchData} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium" title="Refresh">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="px-5 py-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <p className="text-[11px] text-gray-500 dark:text-white/40">
            Profile PPP: <strong>local-address</strong> (gateway), <strong>remote-address</strong> (pool IP / range), bandwidth, DNS, dan only-one (anti-multi-login).
          </p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : profiles.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada profile.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Local Addr</th>
                  <th className="text-left px-4 py-2 font-semibold">Remote Addr</th>
                  <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">Rate Limit</th>
                  <th className="text-left px-4 py-2 font-semibold hidden xl:table-cell">Only One</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {profiles.map((p) => {
                  const isBusy = busyId === p.id;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{p.name}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{p.localAddress || "-"}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 whitespace-nowrap">{p.remoteAddress || "-"}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden lg:table-cell whitespace-nowrap">{p.rateLimit || "-"}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden xl:table-cell whitespace-nowrap">{p.onlyOne}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setEditing({ id: p.id, draft: { ...p } })} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 text-blue-700 dark:text-blue-400 disabled:opacity-50">Edit</button>
                          <button onClick={() => setPendingDelete(p)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">Hapus</button>
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

      {adding && <ProfileModal title="Tambah PPP Profile" draft={adding} onChange={setAdding} pools={pools} onCancel={() => setAdding(null)} onSubmit={handleSaveAdd} busy={busyId === "__add__"} submitLabel="Tambah" />}
      {editing && <ProfileModal title={`Edit ${editing.draft.name}`} draft={editing.draft} onChange={(d) => setEditing({ ...editing, draft: d! })} pools={pools} onCancel={() => setEditing(null)} onSubmit={handleSaveEdit} busy={busyId === editing.id} submitLabel="Simpan" />}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus profile "${pendingDelete.name}"?` : ""}
        description="User PPP yang masih pakai profile ini akan ke-orphan saat dial ulang. Pastikan tidak ada secret aktif yang merujuk."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function ProfileModal({ title, draft, onChange, pools, onCancel, onSubmit, busy, submitLabel }: {
  title: string;
  draft: Draft;
  onChange: (d: Draft) => void;
  pools: string[];
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
  submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 dark:text-white/40">Name</label>
            <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className={inputClass} placeholder="contoh: paket-10mbps" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Local Address (gateway)</label>
            <input value={draft.localAddress} onChange={(e) => onChange({ ...draft, localAddress: e.target.value })} className={inputClass} placeholder="10.10.10.1" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Remote Address (pool / IP)</label>
            <select
              value={pools.includes(draft.remoteAddress) ? draft.remoteAddress : "__custom__"}
              onChange={(e) => {
                if (e.target.value === "__custom__") return;
                onChange({ ...draft, remoteAddress: e.target.value });
              }}
              className={inputClass}
            >
              <option value="__custom__">(input manual)</option>
              {pools.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              value={draft.remoteAddress}
              onChange={(e) => onChange({ ...draft, remoteAddress: e.target.value })}
              className={`${inputClass} mt-1`}
              placeholder="pool atau 10.10.10.10-10.10.10.50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Rate Limit (rx/tx)</label>
            <input value={draft.rateLimit} onChange={(e) => onChange({ ...draft, rateLimit: e.target.value })} className={inputClass} placeholder="10M/10M" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">DNS Server</label>
            <input value={draft.dnsServer} onChange={(e) => onChange({ ...draft, dnsServer: e.target.value })} className={inputClass} placeholder="8.8.8.8,1.1.1.1" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Parent Queue</label>
            <input value={draft.parentQueue} onChange={(e) => onChange({ ...draft, parentQueue: e.target.value })} className={inputClass} placeholder="none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Only One</label>
            <select value={draft.onlyOne} onChange={(e) => onChange({ ...draft, onlyOne: e.target.value })} className={inputClass}>
              {ONLY_ONE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-white/40">Session Timeout</label>
            <input value={draft.sessionTimeout} onChange={(e) => onChange({ ...draft, sessionTimeout: e.target.value })} className={inputClass} placeholder="kosong = unlimited" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 dark:text-white/40">Comment</label>
            <input value={draft.comment} onChange={(e) => onChange({ ...draft, comment: e.target.value })} className={inputClass} placeholder="optional" />
          </div>
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
