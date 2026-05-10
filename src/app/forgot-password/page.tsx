"use client";

import { useState } from "react";
import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      return setError(data.error || "Terjadi kesalahan");
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold mb-2">Cek Email Anda</h2>
          <p className="text-white/60">
            Jika email <strong>{email}</strong> terdaftar, link reset password sudah dikirim.
            Link berlaku selama 1 jam.
          </p>
          <Link href="/login" className="inline-block mt-6 text-blue-400 hover:underline text-sm">
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-400">{APP_NAME}</Link>
          <h1 className="text-xl font-semibold mt-3">Lupa Password</h1>
          <p className="text-white/50 text-sm mt-1">
            Masukkan email Anda dan kami akan kirimkan link reset password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="admin@bisnis.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-semibold transition"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          <Link href="/login" className="text-blue-400 hover:underline">Kembali ke halaman masuk</Link>
        </p>
      </div>
    </div>
  );
}
