"use client";

import { useCallback, useEffect, useState } from "react";

type AdminLevel = "SUPER" | "ADMIN" | "OPERATOR";
type CreateRole = "ADMIN" | "OPERATOR" | "TENANT";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  adminLevel: "SUPER" | "ADMIN" | "OPERATOR" | null;
  status: string;
  createdAt: string;
};

const LEVEL_BADGES: Record<string, { label: string; cls: string }> = {
  SUPER: { label: "Superadmin", cls: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  ADMIN: { label: "Admin", cls: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  OPERATOR: { label: "Operator", cls: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" },
};

export default function UsersClient({ adminLevel }: { adminLevel: AdminLevel }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Form modal state
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<CreateRole>("OPERATOR");
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    brand: "", alamat: "", noWa: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const resetForm = () => {
    setRole("OPERATOR");
    setForm({ name: "", email: "", password: "", brand: "", alamat: "", noWa: "" });
    setFormErr("");
  };

  const openModal = () => { resetForm(); setOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      role,
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    };
    if (role === "TENANT") {
      payload.brand = form.brand.trim() || undefined;
      payload.alamat = form.alamat.trim() || undefined;
      payload.noWa = form.noWa.trim() || undefined;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setFormErr(data.error || "Gagal bikin user");
    showMsg("ok", `${role === "TENANT" ? "Tenant" : role === "ADMIN" ? "Admin" : "Operator"} berhasil dibuat`);
    setOpen(false);
    if (role !== "TENANT") fetchUsers();
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Hapus ${u.name} (${u.email})?`)) return;
    setActionLoading(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setActionLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return showMsg("err", data.error || "Gagal hapus");
    }
    showMsg("ok", "User dihapus");
    fetchUsers();
  };

  const handleResetPassword = async (u: AdminUser) => {
    const newPass = prompt(`Password baru untuk ${u.name} (min 8 char):`);
    if (!newPass) return;
    if (newPass.length < 8) return showMsg("err", "Password minimal 8 karakter");
    setActionLoading(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return showMsg("err", data.error || "Gagal reset password");
    }
    showMsg("ok", "Password di-reset");
  };

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange";

  // Bisakah viewer aksi pada target user ini?
  const canActOn = (u: AdminUser): boolean => {
    if (u.adminLevel === "SUPER") return false;
    if (adminLevel === "ADMIN" && u.adminLevel === "ADMIN") return false;
    return true;
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tambah User</h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">
            Kelola akun admin & operator. Tenant juga bisa dibuat manual dari sini (skip verifikasi email).
          </p>
        </div>
        <button
          onClick={openModal}
          className="text-sm px-3 py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white font-medium transition"
        >
          + Tambah User
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${
          message.type === "ok"
            ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"
            : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Belum ada admin/operator</div>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Nama</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Level</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Dibuat</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                  {users.map((u) => {
                    const badge = LEVEL_BADGES[u.adminLevel ?? "SUPER"];
                    const act = canActOn(u);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-white/60">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-white/30">
                          {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end flex-wrap">
                            {act ? (
                              <>
                                <button
                                  onClick={() => handleResetPassword(u)}
                                  disabled={actionLoading === u.id}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition disabled:opacity-50"
                                >
                                  Reset Password
                                </button>
                                <button
                                  onClick={() => handleDelete(u)}
                                  disabled={actionLoading === u.id}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition disabled:opacity-50"
                                >
                                  Hapus
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-300 dark:text-white/20">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="lg:hidden divide-y divide-gray-50 dark:divide-white/5">
              {users.map((u) => {
                const badge = LEVEL_BADGES[u.adminLevel ?? "SUPER"];
                const act = canActOn(u);
                return (
                  <li key={u.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.cls} shrink-0`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-white/50 truncate">{u.email}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">
                      Dibuat {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {act && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={actionLoading === u.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition disabled:opacity-50"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={actionLoading === u.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 transition disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Modal Tambah User */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Tambah User Baru</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white/80 transition" aria-label="Tutup">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto">
              {formErr && (
                <div className="text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                  {formErr}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as CreateRole)}
                  className={inputClass + " mt-1"}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="TENANT">Tenant (reseller)</option>
                </select>
                <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
                  {role === "ADMIN" && "Akses penuh kelola tenant + kelola operator + pengaturan (kecuali field brand)."}
                  {role === "OPERATOR" && "Staff harian: cuma bisa validasi tenant + balas inbox."}
                  {role === "TENANT" && "User reseller. Auto-validated, langsung bisa pakai agent."}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Nama</label>
                <input
                  required value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass + " mt-1"}
                  placeholder="Nama lengkap"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Email</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={inputClass + " mt-1"}
                  placeholder="nama@mail.com"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-white/50">Password</label>
                <input
                  type="text" required value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className={inputClass + " mt-1"}
                  placeholder="Min 8 karakter"
                  minLength={8}
                />
                <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">User pakai password ini buat login pertama kali. Kasih tau langsung ke user.</p>
              </div>

              {role === "TENANT" && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-white/50">Brand <span className="text-gray-400">(opsional)</span></label>
                    <input
                      value={form.brand}
                      onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                      className={inputClass + " mt-1"}
                      placeholder="contoh: replaymedia"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-white/50">Alamat <span className="text-gray-400">(opsional)</span></label>
                    <input
                      value={form.alamat}
                      onChange={(e) => setForm((p) => ({ ...p, alamat: e.target.value }))}
                      className={inputClass + " mt-1"}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-white/50">No. WA <span className="text-gray-400">(opsional)</span></label>
                    <input
                      value={form.noWa}
                      onChange={(e) => setForm((p) => ({ ...p, noWa: e.target.value }))}
                      className={inputClass + " mt-1"}
                      placeholder="62812..."
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {submitting ? "Membuat..." : "Buat User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
