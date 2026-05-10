"use client";

import { useState } from "react";
import { User } from "@/generated/prisma/client";

type View = "profile" | "password";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default function DashboardShell({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [view, setView] = useState<View>("profile");

  const [name, setName] = useState(user.name);
  const [alamat, setAlamat] = useState(user.alamat || "");
  const [noWa, setNoWa] = useState(user.noWa || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showMsg("err", "Nama tidak boleh kosong");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, alamat, noWa }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setUser((u) => ({ ...u, name, alamat, noWa }));
      showMsg("ok", "Profil berhasil diperbarui");
    } else {
      showMsg("err", data.error || "Gagal memperbarui profil");
    }
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
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      showMsg("ok", "Password berhasil diperbarui");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showMsg("err", data.error || "Gagal memperbarui password");
    }
  };

  const brandUrl = `${window !== undefined ? window.location.protocol : "https:"}//${user.brand}.${APP_DOMAIN}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect y="2" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
              <rect y="14" width="18" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          <span className="font-bold text-blue-400 text-lg">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60 hidden sm:block">{user.name}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition"
            title="Keluar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-56" : "w-0"
          } transition-all duration-200 overflow-hidden shrink-0 bg-slate-900 border-r border-white/10 flex flex-col`}
        >
          <nav className="flex-1 py-4 px-2 space-y-1">
            {/* Profil menu */}
            <div>
              <button
                onClick={() => setProfileExpanded((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Profil</span>
                </div>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform ${profileExpanded ? "rotate-180" : ""}`}
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {profileExpanded && (
                <div className="mt-1 ml-4 space-y-1">
                  <button
                    onClick={() => setView("profile")}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${
                      view === "profile"
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Update Profil
                  </button>
                  <button
                    onClick={() => setView("password")}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${
                      view === "password"
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Ganti Password
                  </button>
                </div>
              )}
            </div>

            {/* Buka Situs */}
            <a
              href={`//${user.brand}.${APP_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Buka Situs</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-50">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </nav>

          {/* Brand info di bawah sidebar */}
          <div className="px-3 py-3 border-t border-white/10">
            <p className="text-xs text-white/30 truncate">{user.brand}.{APP_DOMAIN}</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto space-y-4">
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

            {/* Update Profil */}
            {view === "profile" && (
              <form onSubmit={handleUpdateProfile} className="bg-slate-900 rounded-xl border border-white/10 p-6 space-y-4">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Update Profil</h2>

                <div className="space-y-1">
                  <label className="text-sm text-white/60">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-white/60">Email</label>
                  <input
                    type="text"
                    value={user.email}
                    disabled
                    className="w-full bg-slate-800/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white/30 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-white/60">Alamat</label>
                  <input
                    type="text"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="Jl. Merdeka No. 1, Jakarta"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-white/60">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    value={noWa}
                    onChange={(e) => setNoWa(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </form>
            )}

            {/* Ganti Password */}
            {view === "password" && (
              <form onSubmit={handleUpdatePassword} className="bg-slate-900 rounded-xl border border-white/10 p-6 space-y-4">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Ganti Password</h2>

                {[
                  { label: "Password Lama", value: currentPassword, set: setCurrentPassword },
                  { label: "Password Baru", value: newPassword, set: setNewPassword },
                  { label: "Konfirmasi Password Baru", value: confirmPassword, set: setConfirmPassword },
                ].map(({ label, value, set }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-sm text-white/60">{label}</label>
                    <input
                      type="password"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Perbarui Password"}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
