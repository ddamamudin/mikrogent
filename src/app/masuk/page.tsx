"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Email atau password salah");
    router.push("/dashboard");
  };

  const inputClass = "w-full bg-gray-100 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition text-[15px]";

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      <div className="pt-20 pb-10 text-center">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mikroplay-logo-and-text.png" alt="Mikroplay" className="h-16 w-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-bold mt-5 text-gray-900">Selamat datang</h1>
        <p className="text-gray-400 text-sm mt-1">Masuk ke akun Mikroplay Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500 px-1">Email</label>
          <input
            type="email" value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required className={inputClass} placeholder="nama@mail.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <label className="text-sm font-medium text-gray-500">Password</label>
            <Link href="/lupa-password" className="text-xs text-blue-600">Lupa password?</Link>
          </div>
          <input
            type="password" value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required className={inputClass} placeholder="Password Anda"
          />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition text-[15px] mt-2">
          {loading ? "Masuk..." : "Masuk"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-2">
          Belum punya akun?{" "}
          <Link href="/daftar" className="text-blue-600 font-medium">Daftar</Link>
        </p>
      </form>
    </div>
  );
}
