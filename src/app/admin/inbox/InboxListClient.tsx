"use client";

import { useCallback, useEffect, useState } from "react";

type InboxItem = {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  lastMessage: { body: string; fromRole: "USER" | "ADMIN"; createdAt: string } | null;
  unreadCount: number;
};

export default function InboxListClient() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: statusFilter });
    const res = await fetch(`/api/admin/inbox?${params}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    if (!opts?.silent) setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=admin:inbox");
    es.addEventListener("feedback.changed", () => { fetchInbox({ silent: true }); });
    es.addEventListener("ready", () => { fetchInbox({ silent: true }); });
    return () => { es.close(); };
  }, [fetchInbox]);

  const inputClass = "bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Inbox Masukan</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{total} thread</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">Semua Status</option>
          <option value="OPEN">Terbuka</option>
          <option value="RESOLVED">Selesai</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Belum ada masukan</div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-white/5">
            {items.map((f) => (
              <li key={f.id}>
                <a
                  href={`/admin/inbox/${f.id}`}
                  className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition ${f.unreadCount > 0 ? "bg-blue-50/40 dark:bg-blue-500/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-sm font-semibold ${f.unreadCount > 0 ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-white/70"}`}>
                          {f.user.name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-white/30">{f.user.email}</span>
                        {f.status === "RESOLVED" && (
                          <span className="text-[10px] px-2 py-0 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40">Selesai</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-white/80 font-medium truncate">{f.subject}</p>
                      {f.lastMessage && (
                        <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 line-clamp-1">
                          {f.lastMessage.fromRole === "ADMIN" ? "Kamu: " : ""}{f.lastMessage.body}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] text-gray-400 dark:text-white/30">
                        {new Date(f.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {f.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center leading-none">
                          {f.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 dark:text-white/30">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-600 dark:text-white/60">
              Sebelumnya
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-600 dark:text-white/60">
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
