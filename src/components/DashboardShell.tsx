"use client";

import { User } from "@/generated/prisma/client";
import { useState } from "react";

type Tab = "profile" | "security";

export default function DashboardShell({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `${window.location.protocol}//${appDomain}/login`;
  };

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showMsg("err", "Nama tidak boleh kosong");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain: user.subdomain, name }),
    });
    setLoading(false);
    const data = await res.json();
    if (res.ok) showMsg("ok", "Profil berhasil diperbarui");
    else showMsg("err", data.error || "Gagal memperbarui profil");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return showMsg("err", "Semua field wajib diisi");
    if (newPassword !== confirmPassword) return showMsg("err", "Password baru tidak cocok");
    if (newPassword.length < 8) return showMsg("err", "Password minimal 8 karakter");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain: user.subdomain, currentPassword, newPassword }),
    });
    setLoading(false);
    const data = await res.json();
    if (res.ok) {
      showMsg("ok", "Password berhasil diperbarui");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showMsg("err", data.error || "Gagal memperbarui password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="text-blue-400 font-bold text-lg">Mikroplay</div>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm hidden sm:block">
            {user.subdomain}.{appDomain}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-4">
          {/* Avatar & info */}
          <div className="bg-slate-800 rounded-xl border border-white/10 p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-blue-400">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-white/40 text-sm">{user.email}</p>
              <p className="text-white/30 text-xs mt-0.5">
                {user.subdomain}.{appDomain}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-white/10">
            {(["profile", "security"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setMessage(null); }}
                className={`flex-1 py-2 text-sm rounded-md transition font-medium ${
                  tab === t
                    ? "bg-slate-700 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {t === "profile" ? "Profil" : "Keamanan"}
              </button>
            ))}
          </div>

          {/* Toast */}
          {message && (
            <div
              className={`text-sm px-4 py-3 rounded-lg ${
                message.type === "ok"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Tab: Profil */}
          {tab === "profile" && (
            <form
              onSubmit={handleUpdateProfile}
              className="bg-slate-800 rounded-xl border border-white/10 p-6 space-y-4"
            >
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                Edit Profil
              </h3>
              <div className="space-y-1">
                <label className="text-sm text-white/50">Nama</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-white/50">Email</label>
                <input
                  type="text"
                  value={user.email}
                  disabled
                  className="w-full bg-slate-700/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white/30 cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          )}

          {/* Tab: Keamanan */}
          {tab === "security" && (
            <form
              onSubmit={handleUpdatePassword}
              className="bg-slate-800 rounded-xl border border-white/10 p-6 space-y-4"
            >
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                Ganti Password
              </h3>
              {[
                { label: "Password Lama", value: currentPassword, set: setCurrentPassword },
                { label: "Password Baru", value: newPassword, set: setNewPassword },
                { label: "Konfirmasi Password Baru", value: confirmPassword, set: setConfirmPassword },
              ].map(({ label, value, set }) => (
                <div key={label} className="space-y-1">
                  <label className="text-sm text-white/50">{label}</label>
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Perbarui Password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
