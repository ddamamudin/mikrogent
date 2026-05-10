"use client";

import { useState } from "react";

type Config = { adminSetupEnabled: boolean; showBrandField: boolean };
type Admin = { name: string; email: string };

export default function PengaturanClient({ config: initial, admin }: { config: Config; admin: Admin }) {
  const [setupEnabled, setSetupEnabled] = useState(initial.adminSetupEnabled);
  const [showBrand, setShowBrand] = useState(initial.showBrandField);
  const [configLoading, setConfigLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleToggleSetup = async (val: boolean) => {
    setConfigLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSetupEnabled: val }),
    });
    setConfigLoading(false);
    if (res.ok) {
      setSetupEnabled(val);
      showMsg("ok", `Halaman setup admin ${val ? "diaktifkan" : "dinonaktifkan"}`);
    } else {
      showMsg("err", "Gagal menyimpan pengaturan");
    }
  };

  const handleToggleShowBrand = async (val: boolean) => {
    setConfigLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showBrandField: val }),
    });
    setConfigLoading(false);
    if (res.ok) {
      setShowBrand(val);
      showMsg("ok", `Field brand ${val ? "ditampilkan" : "disembunyikan"}`);
    } else {
      showMsg("err", "Gagal menyimpan pengaturan");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return showMsg("err", "Password minimal 8 karakter");
    if (newPassword !== confirmPassword) return showMsg("err", "Konfirmasi password tidak cocok");
    setPassLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setPassLoading(false);
    if (res.ok) {
      showMsg("ok", "Password berhasil diperbarui");
      setNewPassword(""); setConfirmPassword("");
    } else {
      showMsg("err", "Gagal memperbarui password");
    }
  };

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{admin.name} — {admin.email}</p>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {/* Setup Admin Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Halaman Setup Admin</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Aktifkan /admin/setup</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Matikan setelah semua admin dibuat</p>
          </div>
          <button
            onClick={() => handleToggleSetup(!setupEnabled)}
            disabled={configLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${setupEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${setupEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-white/30">
          Status: <span className={setupEnabled ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}>{setupEnabled ? "Aktif" : "Nonaktif"}</span>
          {" — "}URL: <code className="text-xs">/admin/setup</code>
        </p>
      </div>

      {/* Field Brand */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Fitur Brand / Subdomain</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Tampilkan field brand saat daftar</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Matikan jika aplikasi belum menggunakan fitur subdomain</p>
          </div>
          <button
            onClick={() => handleToggleShowBrand(!showBrand)}
            disabled={configLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${showBrand ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showBrand ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-white/30">
          Status: <span className={showBrand ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>{showBrand ? "Ditampilkan" : "Disembunyikan (brand di-generate otomatis dari email)"}</span>
        </p>
      </div>

      {/* Ganti Password */}
      <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Ganti Password</h2>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Password Baru</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClass} placeholder="Min. 8 karakter" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
        </div>
        <button type="submit" disabled={passLoading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
          {passLoading ? "Menyimpan..." : "Perbarui Password"}
        </button>
      </form>
    </div>
  );
}
