"use client";

import { useState } from "react";

export default function ImpersonateBanner({ adminName, targetName }: { adminName: string; targetName: string }) {
  const [loading, setLoading] = useState(false);

  const exitImpersonate = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    window.location.href = data?.redirect || "/admin/router";
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-md text-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
        <span className="truncate">
          <strong>{adminName}</strong> sedang impersonate <strong>{targetName}</strong>
        </span>
      </div>
      <button
        onClick={exitImpersonate}
        disabled={loading}
        className="shrink-0 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition border-none text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Keluar..." : "Keluar Impersonate"}
      </button>
    </div>
  );
}
