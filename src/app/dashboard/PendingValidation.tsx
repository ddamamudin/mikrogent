"use client";

import { useEffect } from "react";

export default function PendingValidation({ name, email }: { name: string; email: string }) {
  const firstName = name.trim().split(/\s+/)[0] || "Kak";

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.validated) {
          window.location.href = "/dashboard/agent";
        }
      } catch {}
    };
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/masuk";
  }
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/agent-logo.png" alt="Replay Agent" className="w-28 h-28 sm:w-32 sm:h-32 mb-6 object-contain opacity-80" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Halo, Kak {firstName}</h1>
      <p className="text-gray-500 text-[15px] leading-relaxed max-w-md mb-1">
        Akun Anda <strong className="text-gray-900">menunggu validasi</strong> dari admin sebelum bisa menggunakan Replay Agent.
      </p>
      <p className="text-gray-400 text-sm mt-3 max-w-md">
        Layanan ini khusus untuk reseller internal. Silakan hubungi admin untuk mempercepat proses validasi akun Anda.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-full px-4 py-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Menunggu validasi
      </div>
      <p className="text-xs text-gray-400 mt-8">Login sebagai <span className="text-gray-600">{email}</span></p>
      <button onClick={handleLogout} className="text-xs text-blue-600 hover:underline mt-2 bg-transparent border-none cursor-pointer p-0">
        Keluar
      </button>
    </div>
  );
}
