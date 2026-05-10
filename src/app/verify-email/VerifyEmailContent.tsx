"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [subdomain, setSubdomain] = useState("");

  useEffect(() => {
    if (!token) return setStatus("error");
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.subdomain) {
          setSubdomain(data.subdomain);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <p className="text-white/60">Memverifikasi email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Email Terverifikasi!</h2>
          <p className="text-white/60 mb-6">
            Akun Anda sudah aktif. Dashboard Anda siap di:
          </p>
          <a
            href={`https://${subdomain}.${appDomain}`}
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition"
          >
            Buka Dashboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-bold mb-2">Link Tidak Valid</h2>
        <p className="text-white/60 mb-6">Link sudah kadaluarsa atau tidak valid.</p>
        <Link href="/register" className="text-blue-400 hover:underline">Daftar ulang</Link>
      </div>
    </div>
  );
}
