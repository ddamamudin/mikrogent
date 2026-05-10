"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) return setStatus("error");
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Memverifikasi email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Email Terverifikasi!</h2>
          <p className="text-gray-500">Akun Anda sudah aktif. Mengarahkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Link Tidak Valid</h2>
        <p className="text-gray-500 mb-6">Link sudah kadaluarsa atau tidak valid.</p>
        <Link href="/register" className="text-blue-600 hover:underline">Daftar ulang</Link>
      </div>
    </div>
  );
}
