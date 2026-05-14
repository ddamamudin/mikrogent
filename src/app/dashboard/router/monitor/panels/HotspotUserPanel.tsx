"use client";

import { useCallback, useEffect, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import ConfirmDialog from "@/components/ConfirmDialog";

type User = {
  id: string;
  name: string;
  password: string;
  profile: string;
  server: string;
  comment: string;
  disabled: boolean;
  limitUptime: string;
  limitBytes: string;
  uptime: string;
  bytesIn: string;
  bytesOut: string;
  macAddress: string;
};

function formatBytes(s: string): string {
  const n = parseInt(s, 10) || 0;
  if (n <= 0) return "0";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

type EditDraft = {
  name: string;
  password: string;
  profile: string;
  comment: string;
  limitUptime: string;
  limitBytes: string;
};

export default function HotspotUserPanel({ routerId }: { routerId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ profile: "", search: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: EditDraft } | null>(null);
  const [adding, setAdding] = useState<EditDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (filter.profile) q.set("profile", filter.profile);
      const res = await fetch(`/api/account/router/${routerId}/hotspot/users?${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Gagal mengambil daftar user");
        setUsers([]);
      } else {
        setUsers((json.data?.users ?? []) as User[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId, filter.profile]);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/profiles`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const names = ((json.data?.profiles ?? []) as Array<{ name: string }>).map((p) => p.name);
      setProfiles(names);
    } catch {}
  }, [routerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchProfiles(); });
    return () => { cancelled = true; };
  }, [fetchProfiles]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchUsers(); });
    return () => { cancelled = true; };
  }, [fetchUsers]);

  const visibleUsers = users.filter((u) => {
    if (!filter.search.trim()) return true;
    const q = filter.search.toLowerCase();
    return u.name.toLowerCase().includes(q) ||
      u.comment.toLowerCase().includes(q) ||
      u.macAddress.toLowerCase().includes(q);
  });

  const handleSaveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/users/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", fields: editing.draft }),
    });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showMsg("err", j?.error ?? "Gagal update user");
      return;
    }
    setEditing(null);
    showMsg("ok", "User diupdate");
    fetchUsers();
  };

  const handleSaveAdd = async () => {
    if (!adding) return;
    if (!adding.name.trim()) { showMsg("err", "Name wajib"); return; }
    setBusyId("__add__");
    const res = await fetch(`/api/account/router/${routerId}/hotspot/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adding),
    });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showMsg("err", j?.error ?? "Gagal tambah user");
      return;
    }
    setAdding(null);
    showMsg("ok", "User ditambahkan");
    fetchUsers();
  };

  const handleAction = async (u: User, action: "enable" | "disable" | "reset") => {
    setBusyId(u.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/users/${encodeURIComponent(u.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showMsg("err", j?.error ?? "Gagal");
      return;
    }
    const labels: Record<typeof action, string> = { enable: "User dinyalakan", disable: "User dimatikan", reset: "Counter direset" };
    showMsg("ok", labels[action]);
    fetchUsers();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/users/${encodeURIComponent(pendingDelete.id)}`, {
      method: "DELETE",
    });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      showMsg("err", j?.error ?? "Gagal hapus user");
      return;
    }
    showMsg("ok", "User dihapus");
    fetchUsers();
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-3 shadow-sm flex flex-wrap gap-2 items-center">
        <select
          value={filter.profile}
          onChange={(e) => setFilter((f) => ({ ...f, profile: e.target.value }))}
          className={`${inputClass} max-w-[180px]`}
        >
          <option value="">Semua profile</option>
          {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          placeholder="Cari name / comment / MAC..."
          className={`${inputClass} flex-1 min-w-[200px]`}
        />
        <button
          onClick={fetchUsers}
          className="text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white/70 font-medium"
        >
          Refresh
        </button>
        <button
          onClick={() => setAdding({ name: "", password: "", profile: profiles[0] ?? "default", comment: "", limitUptime: "", limitBytes: "" })}
          className="text-xs px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
        >
          + Tambah User
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {/* Table panel */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80">
            Hotspot User ({visibleUsers.length}{users.length !== visibleUsers.length ? `/${users.length}` : ""})
          </h2>
        </div>
        {loading && users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visibleUsers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Password</th>
                  <th className="text-left px-4 py-2 font-semibold">Profile</th>
                  <th className="text-left px-4 py-2 font-semibold hidden lg:table-cell">Comment</th>
                  <th className="text-right px-4 py-2 font-semibold hidden xl:table-cell">Uptime</th>
                  <th className="text-right px-4 py-2 font-semibold hidden xl:table-cell">Bytes</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visibleUsers.map((u) => {
                  const isBusy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 ${u.disabled ? "text-gray-400 dark:text-white/30" : "text-green-600 dark:text-green-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.disabled ? "bg-gray-400" : "bg-green-500"}`} />
                          {u.disabled ? "Off" : "On"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{u.name}</td>
                      <td className="px-4 py-2 font-mono text-gray-500 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{u.password || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 dark:text-white/70 whitespace-nowrap">{u.profile}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden lg:table-cell max-w-[200px] truncate" title={u.comment}>{u.comment || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden xl:table-cell whitespace-nowrap">{u.uptime || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden xl:table-cell whitespace-nowrap">
                        {formatBytes(String((parseInt(u.bytesIn, 10) || 0) + (parseInt(u.bytesOut, 10) || 0)))}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleAction(u, u.disabled ? "enable" : "disable")}
                            disabled={isBusy}
                            title={u.disabled ? "Enable" : "Disable"}
                            className="text-[11px] px-2 py-1 rounded bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-white/70 disabled:opacity-50"
                          >
                            {u.disabled ? "On" : "Off"}
                          </button>
                          <button
                            onClick={() => handleAction(u, "reset")}
                            disabled={isBusy}
                            title="Reset counter + MAC binding"
                            className="text-[11px] px-2 py-1 rounded bg-amber-100 dark:bg-amber-500/10 hover:bg-amber-200 text-amber-700 dark:text-amber-400 disabled:opacity-50"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => setEditing({ id: u.id, draft: {
                              name: u.name, password: u.password, profile: u.profile, comment: u.comment,
                              limitUptime: u.limitUptime, limitBytes: u.limitBytes,
                            } })}
                            disabled={isBusy}
                            className="text-[11px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 text-blue-700 dark:text-blue-400 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setPendingDelete(u)}
                            disabled={isBusy}
                            className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50"
                          >
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

      {/* Add modal */}
      {adding && (
        <Modal title="Tambah Hotspot User" onClose={() => setAdding(null)}>
          <UserForm draft={adding} onChange={setAdding} profiles={profiles} />
          <ModalActions onCancel={() => setAdding(null)} onSubmit={handleSaveAdd} busy={busyId === "__add__"} submitLabel="Tambah" />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title={`Edit ${editing.draft.name}`} onClose={() => setEditing(null)}>
          <UserForm draft={editing.draft} onChange={(d) => setEditing({ ...editing, draft: d! })} profiles={profiles} />
          <ModalActions onCancel={() => setEditing(null)} onSubmit={handleSaveEdit} busy={busyId === editing.id} submitLabel="Simpan" />
        </Modal>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus user "${pendingDelete.name}"?` : ""}
        description="Aksi ini permanen, gak bisa di-undo dari router."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, busy, submitLabel }: { onCancel: () => void; onSubmit: () => void; busy: boolean; submitLabel: string }) {
  return (
    <div className="flex gap-2 pt-2 sticky bottom-0 bg-white dark:bg-slate-900">
      <button onClick={onCancel} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium">Batal</button>
      <button onClick={onSubmit} disabled={busy} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium">
        {busy ? "..." : submitLabel}
      </button>
    </div>
  );
}

function UserForm({ draft, onChange, profiles }: { draft: EditDraft; onChange: (d: EditDraft) => void; profiles: string[] }) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-500 dark:text-white/40">Name</label>
        <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className={inputClass} placeholder="username" />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-white/40">Password</label>
        <PasswordInput value={draft.password} onChange={(e) => onChange({ ...draft, password: e.target.value })} className={inputClass} placeholder="password" autoComplete="off" />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-white/40">Profile</label>
        <select value={draft.profile} onChange={(e) => onChange({ ...draft, profile: e.target.value })} className={inputClass}>
          {!profiles.includes(draft.profile) && draft.profile && <option value={draft.profile}>{draft.profile}</option>}
          {profiles.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-white/40">Time Limit (mis. 1d, 12h, 30m)</label>
        <input value={draft.limitUptime} onChange={(e) => onChange({ ...draft, limitUptime: e.target.value })} className={inputClass} placeholder="kosong = unlimited" />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-white/40">Data Limit (bytes — kosong = unlimited)</label>
        <input value={draft.limitBytes} onChange={(e) => onChange({ ...draft, limitBytes: e.target.value })} className={inputClass} placeholder="contoh: 1073741824 (1GB)" type="number" min="0" />
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-white/40">Comment</label>
        <input value={draft.comment} onChange={(e) => onChange({ ...draft, comment: e.target.value })} className={inputClass} placeholder="optional" />
      </div>
    </div>
  );
}
