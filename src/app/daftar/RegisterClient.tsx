"use client";

import { useState } from "react";
import Link from "next/link";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default function RegisterClient({ showBrandField }: { showBrandField: boolean }) {
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
      body: JSON.stringify({ ...form, showBrandField }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Terjadi kesalahan");
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-5">📧</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Cek Email Anda</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Link konfirmasi sudah dikirim ke{" "}
          <strong className="text-gray-900">{form.email}</strong>.
          Klik link tersebut untuk mengaktifkan akun Anda.
        </p>
        <p className="text-sm text-gray-400 mt-3">
          Tidak menemukan emailnya? Cek folder <strong className="text-gray-500">Spam</strong> atau <strong className="text-gray-500">Promosi</strong>.
        </p>
      </div>
    );
  }

  const inputClass = "w-full bg-gray-100 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition text-[15px]";

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      <div className="pt-16 pb-8 text-center">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mikroplay-logo-text.png" alt="Mikroplay" className="h-10 w-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-bold mt-5 text-gray-900">Buat Akun Baru</h1>
        <p className="text-gray-400 text-sm mt-1">Daftar dan mulai kelola MikroTik Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-10">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500 px-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="nama@mail.com" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500 px-1">Password</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} className={inputClass} placeholder="Minimal 8 karakter" />
        </div>

        {showBrandField && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-500 px-1">Brand / Bisnis</label>
            <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden focus-within:bg-gray-200 transition">
              <input
                name="brand" value={form.brand} onChange={handleChange} required minLength={3}
                className="flex-1 bg-transparent px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none text-[15px]"
                placeholder="namabrand"
              />
              <span className="px-3 text-gray-400 text-sm border-l border-gray-200 shrink-0 py-3.5">
                .{APP_DOMAIN}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500 px-1">Nama Lengkap</label>
          <input name="name" value={form.name} onChange={handleChange} required className={inputClass} placeholder="Diki Damamudin" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500 px-1">Alamat</label>
          <input name="alamat" value={form.alamat} onChange={handleChange} className={inputClass} placeholder="Jl. Bahagia No. 1, Ciwiru" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500 px-1">Nomor WhatsApp</label>
          <input name="noWa" type="tel" value={form.noWa} onChange={handleChange} className={inputClass} placeholder="08xxxxxxxxxx" />
        </div>

        <label className="flex items-start gap-3 cursor-pointer px-1 mt-1">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-blue-600 w-4 h-4 shrink-0" />
          <span className="text-sm text-gray-500">
            Saya menyetujui{" "}
            <a href="#" className="text-blue-600">Syarat dan Ketentuan</a>
          </span>
        </label>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition text-[15px] mt-2">
          {loading ? "Mendaftarkan..." : "Daftar"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-2">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="text-blue-600 font-medium">Masuk</Link>
        </p>
      </form>
    </div>
  );
}
