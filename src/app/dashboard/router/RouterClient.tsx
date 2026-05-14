"use client";

import { useCallback, useEffect, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import ConfirmDialog from "@/components/ConfirmDialog";

type RouterRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  sshUser: string;
  sshPass: string;
  connected: boolean;
  apiEnabled: boolean;
  apiPort: number;
};

// Pending new router (belum punya id, belum save)
type PendingRow = {
  tempKey: string;
  name: string;
  host: string;
  port: string;
  sshUser: string;
  sshPass: string;
};

const inputClass =
  "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

export default function RouterClient({
  initialRouters,
  maxRouters: initialMaxRouters,
  activeCredentialId,
}: {
  initialRouters: RouterRow[];
  maxRouters: number;
  activeCredentialId: string | null;
}) {
  const [routers, setRouters] = useState<RouterRow[]>(initialRouters);
  const [maxRouters, setMaxRouters] = useState<number>(initialMaxRouters);
  const [pending, setPending] = useState<PendingRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editDraft, setEditDraft] = useState<any>(null);
  const [showPassId, setShowPassId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pingState, setPingState] = useState<Record<string, { status: "idle" | "ok" | "fail" | "loading"; msg?: string }>>({});
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RouterRow | null>(null);

  // Refetch silent: dipakai SSE handler waktu router/quota berubah dari sisi
  // lain (admin edit, multi-tab, dll). Skip kalau user lagi edit/add — biar
  // gak nge-overwrite draft yang lagi diketik.
  const refetchSilent = useCallback(async () => {
    if (editingId || pending) return;
    try {
      const res = await fetch("/api/account/router", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.routers)) setRouters(data.routers);
      if (typeof data.maxRouters === "number") setMaxRouters(data.maxRouters);
    } catch {}
  }, [editingId, pending]);

  // Realtime: subscribe ke channel personal user. Server fire event saat
  // router CRUD/verify (admin maupun user lain di tab lain) atau saat admin
  // sync defaultMaxRouters → kita refetch state.
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("user.router_changed", () => { refetchSilent(); });
    es.addEventListener("user.max_routers_changed", () => { refetchSilent(); });
    es.addEventListener("ready", () => { refetchSilent(); });
    return () => { es.close(); };
  }, [refetchSilent]);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const canAddMore = routers.length + (pending ? 1 : 0) < maxRouters;
  const nextDefaultName = () => {
    for (let i = 1; i <= maxRouters; i++) {
      const candidate = `Router ${i}`;
      if (!routers.some((r) => r.name === candidate) && pending?.name !== candidate) return candidate;
    }
    return `Router ${routers.length + 1}`;
  };

  const handleAddNew = () => {
    if (!canAddMore) return;
    setPending({
      tempKey: `new-${Date.now()}`,
      name: nextDefaultName(),
      host: "",
      port: "22",
      sshUser: "",
      sshPass: "",
    });
  };

  const handleCancelPending = () => setPending(null);

  const handleSavePending = async () => {
    if (!pending) return;
    if (!pending.host.trim() || !pending.sshUser.trim() || !pending.sshPass.trim()) {
      return showMsg("err", "Host, username, password wajib diisi");
    }
    const portNum = pending.port.trim() ? parseInt(pending.port, 10) : 22;
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      return showMsg("err", "Port harus angka 1-65535");
    }
    setBusyId(pending.tempKey);
    const res = await fetch("/api/account/router", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pending.name,
        host: pending.host,
        port: portNum,
        sshUser: pending.sshUser,
        sshPass: pending.sshPass,
      }),
    });
    setBusyId(null);
    const data = await res.json();
    if (!res.ok) return showMsg("err", data.error || "Gagal menambah router");

    // Auto verify setelah berhasil save
    const newRouter: RouterRow = { ...data.router };
    setRouters((rs) => [...rs, newRouter]);
    setPending(null);
    showMsg("ok", "Router ditambahkan, mengetes koneksi...");
    void verifyRouter(newRouter.id);
  };

  const handlePing = async (id: string, host: string, port: number) => {
    if (!host) return;
    setPingState((s) => ({ ...s, [id]: { status: "loading" } }));
    const res = await fetch("/api/account/router/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port }),
    });
    const data = await res.json();
    if (data.ok) setPingState((s) => ({ ...s, [id]: { status: "ok", msg: `Port ${port} terbuka (${data.latencyMs}ms)` } }));
    else setPingState((s) => ({ ...s, [id]: { status: "fail", msg: data.error || `Gagal connect port ${port}` } }));
  };

  const startEdit = (r: RouterRow) => {
    setEditingId(r.id);
    setEditDraft({ name: r.name, host: r.host, port: String(r.port), sshUser: r.sshUser, sshPass: r.sshPass });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editDraft) return;
    if (!editDraft.host.trim() || !editDraft.sshUser.trim() || !editDraft.sshPass.trim()) {
      return showMsg("err", "Host, username, password wajib diisi");
    }
    const portNum = String(editDraft.port).trim() ? parseInt(String(editDraft.port), 10) : 22;
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      return showMsg("err", "Port harus angka 1-65535");
    }
    setBusyId(id);
    const res = await fetch(`/api/account/router/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editDraft.name,
        host: editDraft.host,
        port: portNum,
        sshUser: editDraft.sshUser,
        sshPass: editDraft.sshPass,
      }),
    });
    setBusyId(null);
    const data = await res.json();
    if (!res.ok) return showMsg("err", data.error || "Gagal menyimpan");
    setRouters((rs) => rs.map((r) => (r.id === id ? { ...r, ...data.router } : r)));
    setEditingId(null);
    setEditDraft(null);
    showMsg("ok", "Tersimpan, mengetes koneksi...");
    void verifyRouter(id);
  };

  const enableApi = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/account/router/${id}/enable-api`, { method: "POST" });
    setBusyId(null);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRouters((rs) => rs.map((r) => (r.id === id ? { ...r, apiEnabled: true } : r)));
      const id_msg = data.identity ? ` (identity: ${data.identity})` : "";
      showMsg("ok", `API aktif${id_msg}. Buka menu Monitor untuk lihat status router.`);
    } else {
      showMsg("err", data?.error || "Gagal aktifkan API");
    }
  };

  const verifyRouter = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/account/router/${id}/verify`, { method: "POST" });
    setBusyId(null);
    const data = await res.json();
    if (res.ok) {
      setRouters((rs) => rs.map((r) => (r.id === id ? { ...r, connected: true } : r)));
      showMsg("ok", "Berhasil terhubung - konfigurasi sudah dipelajari Replay Agent");
    } else {
      setRouters((rs) => rs.map((r) => (r.id === id ? { ...r, connected: false } : r)));
      showMsg("err", `Gagal konek: ${data.error || "unknown"}`);
    }
  };

  const handleDelete = (r: RouterRow) => {
    setPendingDelete(r);
  };

  const confirmDelete = async () => {
    const r = pendingDelete;
    if (!r) return;
    setBusyId(r.id);
    const res = await fetch(`/api/account/router/${r.id}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (res.ok) {
      setRouters((rs) => rs.filter((x) => x.id !== r.id));
      showMsg("ok", "Router dihapus");
    } else {
      const d = await res.json().catch(() => null);
      showMsg("err", d?.error || "Gagal menghapus");
    }
  };

  const renderHeader = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Setting Router</h1>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
            {routers.length}/{maxRouters} router tersimpan
          </p>
        </div>
        {canAddMore && !pending && (
          <button
            onClick={handleAddNew}
            className="text-sm px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
          >
            + Tambah Router
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-white/40">
        Yang penting saat ngisi cuma 2: (1) <strong>SSH aktif di MikroTik &amp; port match</strong>, dan (2) <strong>kredensial benar</strong>. Mau lebih dari {maxRouters} router? Hubungi admin yaa.
      </p>
    </div>
  );

  const connectedCount = routers.filter((r) => r.connected).length;
  const activeRouter = activeCredentialId ? routers.find((r) => r.id === activeCredentialId && r.connected) : null;

  return (
    <div className="space-y-4 max-w-7xl">
      {renderHeader()}

      {routers.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3 shadow-sm flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectedCount > 0 ? "bg-green-500" : "bg-amber-500"}`} />
            <span className="text-sm text-gray-700 dark:text-white/70">
              <strong className="text-gray-900 dark:text-white">{connectedCount}/{routers.length}</strong> router terhubung
            </span>
          </div>
          {activeRouter && (
            <>
              <span className="text-gray-300 dark:text-white/20">·</span>
              <span className="text-sm text-gray-500 dark:text-white/50 truncate">
                Aktif di agent: <strong className="text-gray-700 dark:text-white/70">{activeRouter.name}</strong>
              </span>
            </>
          )}
        </div>
      )}

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {routers.length === 0 && !pending && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-5 py-8 text-center text-sm text-gray-500 dark:text-white/40 shadow-sm">
          Belum ada router. Klik <strong>Tambah Router</strong> untuk mulai onboarding.
        </div>
      )}

      {/* Router cards: 1 kolom di mobile, 2 kolom di desktop biar maksimal
          pakai ruang kanan-kiri tapi tiap card tetep cukup lebar buat detail. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

      {/* Existing routers */}
      {routers.map((r) => {
        const isEditing = editingId === r.id;
        const isBusy = busyId === r.id;
        const ping = pingState[r.id];
        return (
          <div key={r.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {isEditing ? (
                <input
                  value={editDraft?.name ?? ""}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  className={`${inputClass} max-w-xs`}
                  placeholder="Nama router"
                />
              ) : (
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{r.name}</h2>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                  r.connected
                    ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${r.connected ? "bg-green-500" : "bg-amber-500"}`} />
                  {r.connected ? "Terhubung" : "Belum terhubung"}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                  r.apiEnabled
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40"
                }`} title={r.apiEnabled ? `RouterOS API aktif di port ${r.apiPort}` : "RouterOS API belum diaktifkan"}>
                  <span className={`w-1.5 h-1.5 rounded-full ${r.apiEnabled ? "bg-indigo-500" : "bg-gray-400"}`} />
                  {r.apiEnabled ? "API aktif" : "API non-aktif"}
                </span>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-white/40">Host / IP Public</label>
                  <input value={editDraft.host} onChange={(e) => setEditDraft({ ...editDraft, host: e.target.value })} placeholder="103.xx.xx.xx" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-white/40">Port SSH</label>
                  <input type="number" min={1} max={65535} value={editDraft.port} onChange={(e) => setEditDraft({ ...editDraft, port: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-white/40">Username</label>
                  <input value={editDraft.sshUser} onChange={(e) => setEditDraft({ ...editDraft, sshUser: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-white/40">Password</label>
                  <PasswordInput value={editDraft.sshPass} onChange={(e) => setEditDraft({ ...editDraft, sshPass: e.target.value })} className={inputClass} autoComplete="off" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setEditingId(null); setEditDraft(null); }} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium transition">
                    Batal
                  </button>
                  <button onClick={() => handleSaveEdit(r.id)} disabled={isBusy} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition">
                    {isBusy ? "Menyimpan & cek koneksi..." : "Simpan & Tes Koneksi"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-1.5 font-mono text-gray-700 dark:text-white/70">
                <div className="flex gap-3"><span className="text-gray-400 dark:text-white/30 w-20">Host</span><span>{r.host}:{r.port}</span></div>
                <div className="flex gap-3"><span className="text-gray-400 dark:text-white/30 w-20">User</span><span>{r.sshUser}</span></div>
                <div className="flex gap-3 items-start">
                  <span className="text-gray-400 dark:text-white/30 w-20 shrink-0">Pass</span>
                  <span className="flex-1 min-w-0 break-all">{showPassId === r.id ? r.sshPass : "••••••••"}</span>
                  <button onClick={() => setShowPassId(showPassId === r.id ? null : r.id)} className="text-blue-500 hover:text-blue-600 text-xs transition shrink-0">
                    {showPassId === r.id ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>

                {ping && ping.status !== "idle" && (
                  <div className={`mt-2 text-xs rounded-lg px-3 py-2 border font-sans ${
                    ping.status === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20" :
                    ping.status === "fail" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" :
                    "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/5"
                  }`}>
                    {ping.status === "loading" ? `Mengecek port ${r.port}...` : ping.msg}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => handlePing(r.id, r.host, r.port)} disabled={isBusy} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 font-medium transition disabled:opacity-50">
                    Cek Port
                  </button>
                  <button onClick={() => verifyRouter(r.id)} disabled={isBusy} className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium transition disabled:opacity-50">
                    {isBusy ? "..." : "Tes Koneksi"}
                  </button>
                  {!r.apiEnabled && (
                    <button onClick={() => enableApi(r.id)} disabled={isBusy || !r.connected} title={!r.connected ? "Tes koneksi SSH dulu sebelum aktifkan API" : `Aktifkan RouterOS API di port ${r.apiPort}`} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-medium transition disabled:opacity-50">
                      {isBusy ? "..." : "Aktifkan API"}
                    </button>
                  )}
                  <button onClick={() => startEdit(r)} disabled={isBusy} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 font-medium transition disabled:opacity-50">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(r)} disabled={isBusy} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium transition disabled:opacity-50">
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Pending new router */}
      {pending && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-500/30 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <input
              value={pending.name}
              onChange={(e) => setPending({ ...pending, name: e.target.value })}
              className={`${inputClass} max-w-xs`}
              placeholder="Nama router"
            />
            <span className="text-xs text-blue-600 dark:text-blue-400">Router baru</span>
          </div>

          <div className="flex items-start gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-xs text-slate-600 dark:text-white/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              Password dienkripsi <strong>AES-256-GCM</strong> di server, gak pernah dilog. Akses SSH dari router Anda dibatasi cuma ke IP server Mikroplay.
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Host / IP Public</label>
              <input value={pending.host} onChange={(e) => setPending({ ...pending, host: e.target.value })} placeholder="103.xx.xx.xx" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Port SSH</label>
              <input type="number" min={1} max={65535} value={pending.port} onChange={(e) => setPending({ ...pending, port: e.target.value })} placeholder="22" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Username</label>
              <input value={pending.sshUser} onChange={(e) => setPending({ ...pending, sshUser: e.target.value })} placeholder="username MikroTik" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Password</label>
              <PasswordInput value={pending.sshPass} onChange={(e) => setPending({ ...pending, sshPass: e.target.value })} placeholder="password SSH MikroTik" className={inputClass} autoComplete="off" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCancelPending} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium transition">
              Batal
            </button>
            <button onClick={handleSavePending} disabled={busyId === pending.tempKey} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition">
              {busyId === pending.tempKey ? "Menyimpan & Tes Koneksi..." : "Simpan & Tes Koneksi"}
            </button>
          </div>
        </div>
      )}

      </div>{/* /grid router cards */}

      {!canAddMore && !pending && (
        <p className="text-xs text-gray-400 dark:text-white/30 text-center py-2">
          Sudah mencapai batas {maxRouters} router. Hubungi admin kalau mau nambah kuota.
        </p>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus router "${pendingDelete.name}"?` : ""}
        description={pendingDelete && (
          <>
            Memory router & status koneksi-nya ikut hilang.<br />
            <span className="text-xs text-gray-400 dark:text-white/30 font-mono">{pendingDelete.host}:{pendingDelete.port}</span>
          </>
        )}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
