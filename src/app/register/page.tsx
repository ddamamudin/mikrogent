"use client";

import { useState } from "react";
import Link from "next/link";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    brand: "",
    alamat: "",
    noWa: "",
    password: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "brand" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "") : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return setError("Anda harus menyetujui syarat dan ketentuan");
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-400">{APP_NAME}</Link>
          <h1 className="text-xl font-semibold mt-3">Buat Akun Baru</h1>
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
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="admin@bisnis.com"
            />
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

          <div>
            <label className="block text-sm text-white/70 mb-1">Brand / Slug</label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-blue-500">
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                required
                minLength={3}
                className="flex-1 bg-transparent px-4 py-2.5 text-white placeholder-white/30 focus:outline-none"
                placeholder="tokoanda"
              />
              <span className="px-3 text-white/30 text-sm border-l border-white/10 shrink-0">
                .{APP_DOMAIN}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Nama Lengkap</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="Budi Santoso"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Alamat</label>
            <input
              name="alamat"
              value={form.alamat}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="Jl. Merdeka No. 1, Jakarta"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Nomor WhatsApp</label>
            <input
              name="noWa"
              type="tel"
              value={form.noWa}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-blue-500"
            />
            <span className="text-sm text-white/60">
              Saya menyetujui{" "}
              <Link href="/syarat-ketentuan" className="text-blue-400 hover:underline">
                Syarat dan Ketentuan
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-semibold transition"
          >
            {loading ? "Mendaftarkan..." : "Daftar"}
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
