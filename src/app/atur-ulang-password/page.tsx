"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Konfirmasi password tidak cocok");
    if (password.length < 8) return setError("Password minimal 8 karakter");
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Terjadi kesalahan");
    setDone(true);
    setTimeout(() => router.push("/masuk"), 2000);
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Link Tidak Valid</h2>
        <Link href="/lupa-password" className="text-blue-600 hover:underline text-sm">Minta link baru</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Password Berhasil Direset</h2>
        <p className="text-gray-500">Mengarahkan ke halaman masuk...</p>
      </div>
    );
  }

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500";

  return (
    <>
      <div className="text-center mb-8">
        <Link href="/" className="text-2xl font-bold text-blue-600">{APP_NAME}</Link>
        <h1 className="text-xl font-semibold mt-3 text-gray-900">Buat Password Baru</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-4 shadow-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
        )}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Password Baru</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="Minimal 8 karakter" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Konfirmasi Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputClass} placeholder="Ulangi password baru" />
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition">
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </>
  );
}

export default function AturUlangPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<p className="text-center text-gray-400">Memuat...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
