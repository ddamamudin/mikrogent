"use client";

import { useEffect } from "react";

export default function PendingValidation({
  name,
  email,
  adminWa,
}: {
  name: string;
  email: string;
  adminWa?: string;
}) {
  const firstName = name.trim().split(/\s+/)[0] || "Kak";

  // Realtime: subscribe ke channel personal user lewat alias "user:me". Server
  // resolve ke user:<userId> dari session cookie. Begitu admin klik "Validasi",
  // event "user.validated" fire → langsung redirect ke dashboard agent.
  // Fallback: SSE auto-reconnect by browser, dan kita re-check status di event
  // "ready" (saat connect/reconnect) supaya gap waktu offline ke-cover.
  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.validated) {
          window.location.href = "/dashboard/agent";
        }
      } catch {}
    };

    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("ready", () => { checkStatus(); });
    es.addEventListener("user.validated", () => { checkStatus(); });

    return () => { cancelled = true; es.close(); };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/masuk";
  }

  // Normalize nomor WA: hapus karakter non-digit, ganti awalan 0 dengan 62
  const waDigits = adminWa?.replace(/\D/g, "").replace(/^0/, "62") || "";
  const waMessage = encodeURIComponent(
    `Halo admin MikroGent, saya ${name} (${email}) baru daftar dan masih menunggu validasi akun. Mohon dibantu prosesnya. Terima kasih.`,
  );
  const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${waMessage}` : "";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/agent-logo.png" alt="MikroGent" className="w-24 h-24 sm:w-28 sm:h-28 mb-5 object-contain opacity-80" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Halo, Kak {firstName}</h1>
      <p className="text-gray-500 text-[15px] leading-relaxed max-w-md">
        Akun Anda <strong className="text-gray-900">menunggu validasi</strong> dari admin sebelum bisa menggunakan MikroGent.
      </p>

      <div className="mt-5 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-full px-4 py-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Menunggu validasi
      </div>

      <div className="mt-6 max-w-md w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-left space-y-2">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Estimasi waktu</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Biasanya divalidasi <strong>kurang dari 24 jam</strong> pada jam kerja (Senin&ndash;Jumat, 09:00&ndash;17:00 WIB). Halaman ini auto-update begitu admin selesai validasi, gak perlu di-refresh.
        </p>
      </div>

      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.5.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3C4.1 15.1 3.6 13.6 3.6 12c0-4.6 3.8-8.4 8.4-8.4 4.6 0 8.4 3.8 8.4 8.4s-3.8 8.4-8.4 8.4z" />
          </svg>
          Hubungi admin via WhatsApp
        </a>
      )}

      <p className="text-xs text-gray-400 mt-8">Login sebagai <span className="text-gray-600">{email}</span></p>
      <button onClick={handleLogout} className="text-xs text-blue-600 hover:underline mt-2 bg-transparent border-none cursor-pointer p-0">
        Keluar
      </button>
    </div>
  );
}
