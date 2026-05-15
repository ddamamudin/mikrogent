"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
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
      body: JSON.stringify({ email, website }),
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agent-logo.png" alt="LintasAgent" className="w-20 h-20 mb-5 object-contain" />
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Cek Email Anda</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Jika email <strong className="text-gray-900">{email}</strong> terdaftar,
          link reset password sudah dikirim. Link berlaku selama 1 jam.
        </p>
        <Link href="/masuk" className="inline-block mt-8 text-blue-600 text-sm font-medium">
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6">
      <div className="w-full max-w-sm flex flex-col flex-1">
        <div className="pt-20 pb-10 text-center">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lintasagent-logo-text.png" alt="LintasAgent" className="h-10 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold mt-5 text-gray-900">Lupa Password?</h1>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Masukkan email Anda dan kami akan<br />kirimkan link reset password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* honeypot - hidden untuk manusia, dilihat oleh bot */}
          <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-500 px-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-gray-100 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition text-[15px]"
              placeholder="nama@mail.com"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition text-[15px] mt-2">
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>

          <p className="text-center text-sm text-gray-400 mt-2">
            <Link href="/masuk" className="text-blue-600 font-medium">Kembali ke halaman masuk</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
