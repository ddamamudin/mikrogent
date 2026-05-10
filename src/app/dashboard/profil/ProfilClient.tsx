"use client";

import { useState } from "react";
import type { User } from "@/generated/prisma/client";

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

export default function ProfilClient({ user: initialUser }: { user: User }) {
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(user.name);
  const [alamat, setAlamat] = useState(user.alamat || "");
  const [noWa, setNoWa] = useState(user.noWa || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Update Profil</h2>

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Nama Lengkap</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Email</label>
          <input type="text" value={user.email} disabled className="w-full bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 dark:text-white/30 cursor-not-allowed" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Alamat</label>
          <input type="text" value={alamat} onChange={(e) => setAlamat(e.target.value)} className={inputClass} placeholder="Jl. Merdeka No. 1, Jakarta" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Nomor WhatsApp</label>
          <input type="tel" value={noWa} onChange={(e) => setNoWa(e.target.value)} className={inputClass} placeholder="08xxxxxxxxxx" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
