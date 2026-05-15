"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

const inputClass = "w-full bg-gray-100 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition text-[15px]";

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-5">âŒ</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Link Tidak Valid</h2>
        <p className="text-gray-400 text-sm mb-6">Link sudah kedaluwarsa atau tidak valid.</p>
        <Link href="/lupa-password" className="text-blue-600 font-medium text-sm">Minta link baru</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-5">âœ…</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Password Berhasil Direset</h2>
        <p className="text-gray-400 text-sm">Mengarahkan ke halaman masuk...</p>
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
          <h1 className="text-2xl font-bold mt-5 text-gray-900">Buat Password Baru</h1>
          <p className="text-gray-400 text-sm mt-1">Buat password baru yang kuat untuk akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-500 px-1">Password Baru</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="Minimal 8 karakter" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-500 px-1">Konfirmasi Password</label>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputClass} placeholder="Ulangi password baru" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition text-[15px] mt-2">
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AturUlangPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
