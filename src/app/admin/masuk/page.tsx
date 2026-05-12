"use client";

import { useState } from "react";

export default function AdminMasukPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      return setError(data.error || "Login gagal");
    }
    // Full page navigation supaya cookie session terbawa + RSC fresh render
    window.location.href = "/admin/dashboard";
  };

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-10 w-auto mx-auto" />
          <p className="text-sm text-gray-500 dark:text-white/50 mt-2">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Masuk sebagai Admin</h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          </div>

          <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
            {loading ? "Masuk..." : "Masuk"}
          </button>

          <p className="text-xs text-center text-gray-400 dark:text-white/30">
            Belum ada admin?{" "}
            <a href="/admin/setup" className="text-blue-500 hover:underline">Setup Admin</a>
          </p>
        </form>
      </div>
    </div>
  );
}
