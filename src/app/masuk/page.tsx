"use client";

import { useState } from "react";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
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
    if (!res.ok) {
      setLoading(false);
      return setError(data.error || "Email atau password salah");
    }
    // Full page navigation supaya cookie session terbawa + RSC fresh render.
    // Admin diarahkan ke admin dashboard, user biasa ke dashboard mereka.
    window.location.href = data.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
  };

  const inputClass = "w-full bg-gray-100 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition text-[15px]";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6">
      <div className="w-full max-w-sm flex flex-col flex-1">
      <div className="pt-20 pb-10 text-center">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lintasagent-logo-and-text.png" alt="LintasAgent" className="h-16 w-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-bold mt-5 text-gray-900">Selamat datang</h1>
        <p className="text-gray-400 text-sm mt-1">Masuk ke akun LintasAgent Anda</p>
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
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required className={inputClass} placeholder="Password Anda"
          />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker active:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition text-[15px] mt-2">
          {loading ? "Masuk..." : "Masuk"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-2">
          Belum punya akun?{" "}
          <Link href="/daftar" className="text-blue-600 font-medium">Daftar</Link>
        </p>
      </form>
      </div>
    </div>
  );
}
