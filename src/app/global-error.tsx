"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 1.5rem",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827", margin: 0 }}>
              Sistem mengalami error berat
            </h1>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#4b5563" }}>
              Layout utama gagal dirender. Coba muat ulang.
            </p>
            {error.digest ? (
              <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                Ref: {error.digest}
              </p>
            ) : null}
            <button
              onClick={() => unstable_retry()}
              style={{
                marginTop: "1.5rem",
                background: "#2563eb",
                color: "#fff",
                border: 0,
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Coba lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
