"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", subdomain: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "subdomain" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Terjadi kesalahan");
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold mb-2">Cek Email Anda</h2>
          <p className="text-white/60">
            Link konfirmasi sudah dikirim ke <strong>{form.email}</strong>.
            Klik link tersebut untuk mengaktifkan akun Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-400">Mikroplay</Link>
          <h1 className="text-xl font-semibold mt-4">Buat Akun Baru</h1>
          <p className="text-white/50 text-sm mt-1">Gratis, tanpa kartu kredit</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/70 mb-1">Nama Bisnis / Nama Anda</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="PT. Jaringan Sejahtera"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="admin@bisnisanda.com"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Subdomain</label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-blue-500">
              <input
                name="subdomain"
                value={form.subdomain}
                onChange={handleChange}
                required
                minLength={3}
                className="flex-1 bg-transparent px-4 py-2.5 text-white placeholder-white/30 focus:outline-none"
                placeholder="bisnisanda"
              />
              <span className="px-3 text-white/30 text-sm border-l border-white/10">.mikroplay.com</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="Minimal 8 karakter"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-semibold transition"
          >
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-6">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
