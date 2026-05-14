"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function SystemPanel({ routerId, routerName }: { routerId: string; routerName: string }) {
  const [pending, setPending] = useState<"reboot" | "shutdown" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 6000);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/account/router/${routerId}/system/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMsg("err", j?.error ?? "Gagal");
      } else {
        const label = pending === "reboot" ? "reboot" : "shutdown";
        showMsg("ok", `Perintah ${label} terkirim. Router akan terputus sebentar${pending === "shutdown" ? " (perlu power-on manual)" : ""}.`);
      }
    } catch (e) {
      showMsg("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            <span>System Power</span>
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-white/40">
            Aksi pada router <strong className="text-gray-700 dark:text-white/70">{routerName}</strong>. Setelah dieksekusi, koneksi RouterOS API
            akan terputus sementara. Reboot akan reconnect otomatis dalam ~1 menit. Shutdown
            mematikan router total — perlu hidupkan manual.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setPending("reboot")}
              disabled={busy}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 disabled:opacity-50 text-left transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold">Reboot</p>
                <p className="text-[11px] opacity-80">Restart router, ~1 menit downtime</p>
              </div>
            </button>

            <button
              onClick={() => setPending("shutdown")}
              disabled={busy}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-300 disabled:opacity-50 text-left transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold">Shutdown</p>
                <p className="text-[11px] opacity-80">Matikan total — perlu power-on manual</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        variant="danger"
        title={pending === "reboot" ? `Reboot ${routerName}?` : pending === "shutdown" ? `Shutdown ${routerName}?` : ""}
        description={
          pending === "reboot"
            ? "Router akan restart. Semua user hotspot/PPP akan terputus, koneksi pulih otomatis dalam ~1 menit."
            : pending === "shutdown"
            ? "Router akan mati total. Kamu HARUS hidupkan secara fisik untuk pakai lagi. Yakin?"
            : ""
        }
        confirmLabel={pending === "reboot" ? "Reboot" : "Shutdown"}
        cancelLabel="Batal"
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
