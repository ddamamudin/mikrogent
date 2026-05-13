"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type InboxItem = {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  updatedAt: string;
  user: { id: string; name: string; email: string };
  lastMessage: { body: string; fromRole: "USER" | "ADMIN"; createdAt: string } | null;
  unreadCount: number;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function InboxDropdown() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inbox?page=1", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems((data.items ?? []).slice(0, 10));
      setTotalUnread(data.totalUnread ?? 0);
    } catch {}
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // Realtime: feedback baru / pesan baru / status berubah
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=admin:inbox");
    es.addEventListener("feedback.changed", () => { fetchInbox(); });
    es.addEventListener("ready", () => { fetchInbox(); });
    return () => { es.close(); };
  }, [fetchInbox]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition"
        title="Inbox masukan"
        aria-label="Inbox"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22 6 12 13 2 6" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Inbox Masukan</h3>
            <a href="/admin/inbox" className="text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={() => setOpen(false)}>
              Lihat semua
            </a>
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Belum ada masukan dari user</div>
            ) : (
              items.map((f) => (
                <a
                  key={f.id}
                  href={`/admin/inbox/${f.id}`}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition ${
                    f.unreadCount > 0 ? "bg-blue-50/40 dark:bg-blue-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className={`text-sm font-medium truncate ${f.unreadCount > 0 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-white/60"}`}>
                          {f.user.name}
                        </p>
                        {f.status === "RESOLVED" && (
                          <span className="text-[10px] px-1.5 py-0 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40">selesai</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-white/50 truncate">{f.subject}</p>
                      {f.lastMessage && (
                        <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5 line-clamp-1">
                          {f.lastMessage.fromRole === "ADMIN" ? "Kamu: " : ""}{f.lastMessage.body}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-gray-400 dark:text-white/30">{timeAgo(f.updatedAt)}</span>
                      {f.unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                          {f.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
