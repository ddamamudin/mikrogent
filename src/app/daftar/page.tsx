"use client";

import { useState } from "react";
import Link from "next/link";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "", email: "", brand: "", alamat: "", noWa: "", password: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Cek Email Anda</h2>
          <p className="text-gray-500">
            Link konfirmasi sudah dikirim ke <strong className="text-gray-900">{form.email}</strong>.
            Klik link tersebut untuk mengaktifkan akun Anda.
          </p>
          <p className="text-sm text-gray-400 mt-3">
            Tidak menemukan emailnya? Periksa folder <strong className="text-gray-500">Spam</strong> atau <strong className="text-gray-500">Promosi</strong>.
          </p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">{APP_NAME}</Link>
          <h1 className="text-xl font-semibold mt-3 text-gray-900">Buat Akun Baru</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-4 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="nama@mail.com" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} className={inputClass} placeholder="Minimal 8 karakter" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Brand / Bisnis</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-500">
              <input
                name="brand" value={form.brand} onChange={handleChange} required minLength={3}
                className="flex-1 bg-transparent px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none"
                placeholder="namabrand"
              />
              <span className="px-3 text-gray-400 text-sm border-l border-gray-200 shrink-0">
                .{APP_DOMAIN}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Nama Lengkap</label>
            <input name="name" value={form.name} onChange={handleChange} required className={inputClass} placeholder="Diki Damamudin" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Alamat</label>
            <input name="alamat" value={form.alamat} onChange={handleChange} className={inputClass} placeholder="Jl. Bahagia No. 1, Ciwiru" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Nomor WhatsApp</label>
            <input name="noWa" type="tel" value={form.noWa} onChange={handleChange} className={inputClass} placeholder="08xxxxxxxxxx" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-blue-600" />
            <span className="text-sm text-gray-500">
              Saya menyetujui{" "}
              <Link href="/syarat-ketentuan" className="text-blue-600 hover:underline">Syarat dan Ketentuan</Link>
            </span>
          </label>

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition">
            {loading ? "Mendaftarkan..." : "Daftar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="text-blue-600 hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
