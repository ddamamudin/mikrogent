"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type SessionItem = { id: string; title: string | null; updatedAt: string };

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}h`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// List sesi chat di sidebar (cuma muncul saat route /dashboard/agent).
// Fetch awal saat mount + reload tiap kali pathname/searchParams berubah (user
// switch sesi atau bikin sesi baru). Server udah ngurus FIFO 10 di POST endpoint.
export default function SessionsListSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get("session");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<SessionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAgentPage = pathname === "/dashboard/agent";

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/sessions", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.sessions)) setSessions(data.sessions);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAgentPage) return;
    fetchSessions();
  }, [isAgentPage, fetchSessions, currentSessionId, pathname]);

  const handleDelete = async (s: SessionItem) => {
    setDeletingId(s.id);
    try {
      const res = await fetch(`/api/agent/sessions/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPendingDelete(null);
      // Kalau yang dihapus = sesi aktif, navigate ke /dashboard/agent (server bakal
      // pick most-recent atau auto-create). Kalau bukan, cukup reload list.
      if (s.id === currentSessionId) {
        window.location.href = "/dashboard/agent";
      } else {
        await fetchSessions();
      }
    } catch {
      // gagal hapus → biarkan state, user bisa retry
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAgentPage) return null;
  if (sessions.length === 0) return null;

  return (
    <>
      <div className="mt-2 px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">
        Histori ({sessions.length}/10)
      </div>
      <div className="space-y-0.5">
        {sessions.map((s) => {
          const active = s.id === currentSessionId;
          const title = s.title || "Chat baru";
          return (
            <div key={s.id} className="group relative">
              <a
                href={`/dashboard/agent?session=${s.id}`}
                className={`flex items-start gap-2 pl-3 pr-8 py-1.5 rounded-lg text-sm transition ${
                  active
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                    : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
                title={title}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13px]">{title}</div>
                  <div className="text-[10px] text-gray-400 dark:text-white/30">{relativeTime(s.updatedAt)}</div>
                </div>
              </a>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPendingDelete(s);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1 rounded text-gray-400 dark:text-white/30 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition"
                aria-label={`Hapus sesi ${title}`}
                title="Hapus sesi"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => deletingId === null && setPendingDelete(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Hapus sesi chat?</h3>
            <p className="text-sm text-gray-600 dark:text-white/60">
              <strong className="text-gray-900 dark:text-white">{pendingDelete.title || "Chat baru"}</strong> akan dihapus permanen dari riwayat.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 text-sm font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pendingDelete)}
                disabled={deletingId !== null}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {deletingId !== null ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
