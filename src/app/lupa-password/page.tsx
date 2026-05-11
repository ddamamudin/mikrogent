"use client";

import { useState } from "react";
import Link from "next/link";


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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Cek Email Anda</h2>
          <p className="text-gray-500">
            Jika email <strong className="text-gray-900">{email}</strong> terdaftar,
            link reset password sudah dikirim. Link berlaku selama 1 jam.
          </p>
          <Link href="/masuk" className="inline-block mt-6 text-blue-600 hover:underline text-sm">
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-10 w-auto mx-auto" />
          </Link>
          <h1 className="text-xl font-semibold mt-3 text-gray-900">Lupa Password</h1>
          <p className="text-gray-500 text-sm mt-1">
            Masukkan email Anda dan kami akan kirimkan link reset password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-4 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="nama@mail.com"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition">
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/masuk" className="text-blue-600 hover:underline">Kembali ke halaman masuk</Link>
        </p>
      </div>
    </div>
  );
}
