"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NotifItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const TYPE_ICON: Record<string, string> = {
  user_registered: "👤",
  user_email_verified: "✉️",
  feedback_received: "💬",
  feedback_replied: "↩️",
  feedback_resolved: "✅",
};

export default function NotificationBell() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=15", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // Realtime: subscribe channel personal (user:me). Server fire "notif.created"
  // tiap kali ada notif baru atau status read berubah.
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("notif.created", () => { fetchNotifs(); });
    es.addEventListener("ready", () => { fetchNotifs(); });
    return () => { es.close(); };
  }, [fetchNotifs]);

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

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    fetchNotifs();
  };

  const handleClickNotif = async (n: NotifItem) => {
    if (!n.readAt) {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
    }
    setOpen(false);
    if (n.link) window.location.href = n.link;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition"
        title="Notifikasi"
        aria-label="Notifikasi"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Belum ada notifikasi</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition ${
                    !n.readAt ? "bg-blue-50/40 dark:bg-blue-500/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${!n.readAt ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-white/60"}`}>
                          {n.title}
                        </p>
                        {!n.readAt && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
