"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type SessionItem = { id: string; title: string | null; updatedAt: string };

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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SessionItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-close menu kalau klik di luar
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(`[data-menu-id="${menuOpenId}"]`)) return;
      setMenuOpenId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [menuOpenId]);

  // Focus input saat rename modal kebuka
  useEffect(() => {
    if (renameTarget) {
      setRenameValue(renameTarget.title || "");
      // delay sampai modal kerender
      setTimeout(() => renameInputRef.current?.select(), 50);
    }
  }, [renameTarget]);

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

  const handleRename = async () => {
    if (!renameTarget) return;
    const newTitle = renameValue.trim();
    if (!newTitle) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/agent/sessions/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error();
      setRenameTarget(null);
      await fetchSessions();
    } catch {
      // gagal rename → biarkan modal kebuka, user bisa retry
    } finally {
      setRenaming(false);
    }
  };

  if (!isAgentPage) return null;
  if (sessions.length === 0) return null;

  return (
    <>
      {/* Section header sticky di atas scroll container */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 mx-1 pt-3 pb-1 border-t border-gray-200 dark:border-white/10">
        <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">
          Histori ({sessions.length}/10)
        </p>
      </div>
      <div className="pb-2">
        {sessions.map((s) => {
          const active = s.id === currentSessionId;
          const title = s.title || "Chat baru";
          const menuOpen = menuOpenId === s.id;
          return (
            <div key={s.id} className="group relative" data-menu-id={s.id}>
              <a
                href={`/dashboard/agent?session=${s.id}`}
                className={`flex items-center gap-2 pl-3 pr-8 py-1.5 rounded-lg text-[13px] transition ${
                  active
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                    : "text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
                title={title}
              >
                <span className="flex-1 min-w-0 truncate">{title}</span>
              </a>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpenId(menuOpen ? null : s.id);
                }}
                className={`absolute top-1/2 -translate-y-1/2 right-1.5 p-1 rounded text-gray-400 dark:text-white/30 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white transition ${
                  menuOpen ? "opacity-100 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white" : "opacity-0 group-hover:opacity-100"
                }`}
                aria-label={`Opsi sesi ${title}`}
                title="Opsi"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-1.5 top-full mt-0.5 z-20 w-36 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpenId(null);
                      setRenameTarget(s);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                    Ganti nama
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpenId(null);
                      setPendingDelete(s);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                    Hapus
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm Hapus */}
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

      {/* Rename modal */}
      {renameTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !renaming && setRenameTarget(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ganti nama sesi</h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape" && !renaming) setRenameTarget(null);
              }}
              maxLength={60}
              placeholder="Nama sesi baru"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500"
              autoComplete="off"
            />
            <p className="text-[11px] text-gray-400 dark:text-white/30">Maks 60 karakter.</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                disabled={renaming}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 text-sm font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRename}
                disabled={renaming || !renameValue.trim()}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {renaming ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
