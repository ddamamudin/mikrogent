"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function MasukanSidebarLink() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname.startsWith("/dashboard/masukan");

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const total = (data.items ?? []).reduce(
        (sum: number, x: { unreadCount: number }) => sum + (x.unreadCount || 0),
        0,
      );
      setUnread(total);
    } catch {}
  }, []);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("user.feedback_updated", () => { fetchCount(); });
    es.addEventListener("notif.created", () => { fetchCount(); });
    es.addEventListener("ready", () => { fetchCount(); });
    return () => { es.close(); };
  }, [fetchCount]);

  return (
    <Link
      href="/dashboard/masukan"
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "text-brand-orange dark:text-brand-orange bg-brand-orange-50 dark:bg-brand-orange/10"
          : "text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="flex-1 text-left">Kirim Masukan</span>
      {unread > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
