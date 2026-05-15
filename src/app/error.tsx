"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Ada yang gak beres</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sistem mengalami error tak terduga. Coba muat ulang halaman ini.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-gray-400">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => unstable_retry()}
            className="rounded-md bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
