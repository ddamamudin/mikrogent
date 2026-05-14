"use client";

import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

const CONFIRM_PHRASE = "HAPUS AKUN";

export default function HapusAkunClient({ email }: { email: string }) {
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phraseMatched = confirmPhrase.trim().toUpperCase() === CONFIRM_PHRASE;
  const canSubmit = phraseMatched && deleteEmail.trim() && deletePassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseMatched) {
      setError(`Ketik "${CONFIRM_PHRASE}" persis di kolom konfirmasi.`);
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: deleteEmail, password: deletePassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Gagal menghapus akun");
    window.location.href = "/";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-500/20 p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider">Hapus Akun</h2>
          <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
            Tindakan ini permanen dan tidak dapat dibatalkan. Seluruh data akun, kredensial router, riwayat chat, dan kuota akan dihapus dari sistem.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Email</label>
          <input type="email" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} required placeholder={email} className={inputClass} autoComplete="off" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Password</label>
          <PasswordInput value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required className={inputClass} autoComplete="current-password" />
        </div>

        <div className="space-y-1 pt-2 border-t border-red-100 dark:border-red-500/10">
          <label className="text-sm text-gray-600 dark:text-white/60">
            Ketik <strong className="font-mono text-red-600 dark:text-red-400">{CONFIRM_PHRASE}</strong> untuk konfirmasi
          </label>
          <input
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className={`${inputClass} font-mono ${phraseMatched ? "border-red-400 dark:border-red-500/50" : ""}`}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-gray-400 dark:text-white/30 pt-1">
            Friksi tambahan biar gak kepencet gak sengaja. Wajib persis (huruf kapital).
          </p>
        </div>

        <button type="submit" disabled={!canSubmit} className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? "Menghapus..." : phraseMatched ? "Hapus Akun Saya Sekarang" : "Tulis konfirmasi dulu"}
        </button>
      </div>
    </form>
  );
}
