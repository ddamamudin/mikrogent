"use client";

import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } else {
      showMsg("err", data.error || "Gagal memperbarui password");
    }
  };

  const fields = [
    { label: "Password Lama", value: currentPassword, set: setCurrentPassword },
    { label: "Password Baru", value: newPassword, set: setNewPassword },
    { label: "Konfirmasi Password Baru", value: confirmPassword, set: setConfirmPassword },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Ganti Password</h2>

        {fields.map(({ label, value, set }) => (
          <div key={label} className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">{label}</label>
            <PasswordInput value={value} onChange={(e) => set(e.target.value)} className={inputClass} />
          </div>
        ))}

        <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
          {loading ? "Menyimpan..." : "Perbarui Password"}
        </button>
      </div>
    </form>
  );
}
