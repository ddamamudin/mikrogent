"use client";

import { useCallback, useEffect, useState } from "react";

type Cred = {
  id: string;
  host: string;
  port: number;
  sshUser: string;
  sshPass: string;
  connected: boolean;
  createdAt: string;
  updatedAt: string;
} | null;

type Row = {
  userId: string;
  userName: string;
  userEmail: string;
  userBrand: string | null;
  cred: Cred;
};

type AvailableTenant = { id: string; name: string; email: string; brand: string | null };

export default function RouterListClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPassId, setShowPassId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCredId, setEditingCredId] = useState<string | null>(null);
  const [form, setForm] = useState({ userId: "", host: "", port: "22", sshUser: "replay-agent", sshPass: "" });
  const [available, setAvailable] = useState<AvailableTenant[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), q, filter });
    const res = await fetch(`/api/admin/routers?${params}`);
    const data = await res.json();
    setRows(data.routers ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, q, filter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openAdd = async () => {
    setModalMode("add");
    setEditingCredId(null);
    setForm({ userId: "", host: "", port: "22", sshUser: "replay-agent", sshPass: "" });
    setModalError("");
    const res = await fetch("/api/admin/routers/available-tenants");
    const data = await res.json();
    setAvailable(data.tenants ?? []);
    setModalOpen(true);
  };

  const openEdit = (r: Row) => {
    if (!r.cred) return;
    setModalMode("edit");
    setEditingCredId(r.cred.id);
    setForm({
      userId: r.userId,
      host: r.cred.host,
      port: String(r.cred.port),
      sshUser: r.cred.sshUser,
      sshPass: r.cred.sshPass,
    });
    setModalError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (modalMode === "add" && !form.userId) return setModalError("Pilih tenant dulu");
    if (!form.host || !form.sshUser || !form.sshPass) return setModalError("Host, username, password wajib diisi");

    setModalLoading(true);
    const url = modalMode === "add" ? "/api/admin/routers" : `/api/admin/routers/${editingCredId}`;
    const method = modalMode === "add" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: form.userId,
        host: form.host,
        port: parseInt(form.port, 10) || 22,
        sshUser: form.sshUser,
        sshPass: form.sshPass,
      }),
    });
    setModalLoading(false);
    if (!res.ok) {
      const d = await res.json();
      return setModalError(d.error || "Gagal menyimpan");
    }
    setModalOpen(false);
    showMsg("ok", modalMode === "add" ? "Router ditambahkan" : "Router diperbarui");
    fetchRows();
  };

  const handleDelete = async (r: Row) => {
    if (!r.cred) return;
    if (!confirm(`Hapus kredensial MikroTik "${r.userName}" (${r.cred.host})? Setelah dihapus tenant perlu onboarding ulang.`)) return;
    setActionLoading(r.cred.id);
    const res = await fetch(`/api/admin/routers/${r.cred.id}`, { method: "DELETE" });
    setActionLoading(null);
    if (res.ok) { showMsg("ok", "Router dihapus"); fetchRows(); }
    else showMsg("err", "Gagal menghapus");
  };

  const handleImpersonate = async (r: Row) => {
    if (!confirm(`Login sebagai ${r.userName} (${r.userEmail})?\n\nKamu akan diarahkan ke dashboard mereka. Klik 'Keluar Impersonate' di banner untuk kembali ke admin.`)) return;
    setActionLoading(r.userId);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: r.userId }),
    });
    if (res.ok) {
      window.location.href = "/dashboard/agent";
    } else {
      setActionLoading(null);
      const d = await res.json().catch(() => ({}));
      showMsg("err", d.error || "Gagal impersonate");
    }
  };

  const handleVerify = async (r: Row) => {
    if (!r.cred) return;
    setActionLoading(r.cred.id);
    const res = await fetch(`/api/admin/routers/${r.cred.id}/verify`, { method: "POST" });
    setActionLoading(null);
    const data = await res.json();
    if (res.ok) showMsg("ok", "Koneksi sukses - config sudah di-scan");
    else showMsg("err", `Gagal konek: ${data.error ?? "unknown"}`);
    fetchRows();
  };

  const inputClass = "bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Router</h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{total} tenant terdaftar (untuk setup manual)</p>
        </div>
        <button
          onClick={openAdd}
          className="text-sm px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
        >
          + Tambah Router
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Cari nama, email, brand, host..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className={`${inputClass} flex-1 min-w-48`}
        />
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">Semua Tenant</option>
          <option value="without_router">Belum Ada Router</option>
          <option value="connected">Terhubung</option>
          <option value="disconnected">Putus</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Host:Port</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Password</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {rows.map((r) => (
                  <tr key={r.userId} className="hover:bg-gray-50 dark:hover:bg-white/2 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{r.userName}</div>
                      <div className="text-xs text-gray-400 dark:text-white/30">{r.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-white/80">
                      {r.cred ? `${r.cred.host}:${r.cred.port}` : <span className="text-gray-300 dark:text-white/20">-</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-white/80">
                      {r.cred?.sshUser ?? <span className="text-gray-300 dark:text-white/20">-</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-white/80">
                      {r.cred ? (
                        <div className="flex items-center gap-2">
                          <span>{showPassId === r.cred.id ? r.cred.sshPass : "••••••••"}</span>
                          <button onClick={() => setShowPassId(showPassId === r.cred!.id ? null : r.cred!.id)} className="text-xs text-blue-500 hover:text-blue-600 transition">
                            {showPassId === r.cred.id ? "Sembunyikan" : "Tampilkan"}
                          </button>
                        </div>
                      ) : <span className="text-gray-300 dark:text-white/20">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!r.cred ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Belum Onboarding
                        </span>
                      ) : r.cred.connected ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Terhubung
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Putus
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <button
                          onClick={() => handleImpersonate(r)}
                          disabled={actionLoading === r.userId}
                          title="Login sebagai user ini untuk cek tampilan & dashboard mereka"
                          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/10 hover:bg-purple-200 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 transition disabled:opacity-50 font-medium"
                        >
                          Impersonate
                        </button>
                        {r.cred ? (
                          <>
                            <button
                              onClick={() => handleVerify(r)}
                              disabled={actionLoading === r.cred.id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition disabled:opacity-50"
                            >
                              {actionLoading === r.cred.id ? "..." : "Tes Koneksi"}
                            </button>
                            <button
                              onClick={() => openEdit(r)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(r)}
                              disabled={actionLoading === r.cred.id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-white/20">- belum ada router -</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 dark:text-white/30">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-600 dark:text-white/60">Sebelumnya</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-600 dark:text-white/60">Berikutnya</button>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Tambah Router" : "Edit Router"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              {modalError && (
                <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-lg px-3 py-2 border border-red-200 dark:border-red-500/20">
                  {modalError}
                </div>
              )}

              {modalMode === "add" ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-white/50">Tenant</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    required
                    className={`${inputClass} w-full`}
                  >
                    <option value="">- Pilih tenant -</option>
                    {available.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-white/30">Hanya tenant tervalidasi yang belum punya router</p>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-white/50">
                  <strong className="text-gray-900 dark:text-white">{rows.find((r) => r.userId === form.userId)?.userName}</strong>
                  <div className="text-xs">{rows.find((r) => r.userId === form.userId)?.userEmail}</div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Host (IP public router)</label>
                <input
                  type="text"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  required
                  placeholder="103.xx.xx.xx"
                  className={`${inputClass} w-full font-mono`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Port SSH</label>
                <input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  min={1} max={65535}
                  className={`${inputClass} w-full font-mono`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Username</label>
                <input
                  type="text"
                  value={form.sshUser}
                  onChange={(e) => setForm({ ...form, sshUser: e.target.value })}
                  required
                  className={`${inputClass} w-full font-mono`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Password</label>
                <input
                  type="text"
                  value={form.sshPass}
                  onChange={(e) => setForm({ ...form, sshPass: e.target.value })}
                  required
                  placeholder="Password SSH user"
                  className={`${inputClass} w-full font-mono`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 text-sm font-medium transition">
                  Batal
                </button>
                <button type="submit" disabled={modalLoading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition">
                  {modalLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
