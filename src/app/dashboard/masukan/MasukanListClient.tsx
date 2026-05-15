"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  lastMessage: { body: string; fromRole: "USER" | "ADMIN"; createdAt: string; readByUser: boolean } | null;
  unreadCount: number;
};

export default function MasukanListClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchList = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const res = await fetch("/api/feedback", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
    if (!opts?.silent) setLoading(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("user.feedback_updated", () => { fetchList({ silent: true }); });
    es.addEventListener("ready", () => { fetchList({ silent: true }); });
    return () => { es.close(); };
  }, [fetchList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) return showMsg("err", "Judul dan isi pesan wajib diisi");
    setSending(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: s, body: b }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setSubject(""); setBody(""); setShowForm(false);
      showMsg("ok", "Masukan terkirim. Admin akan balas via inbox ini.");
      fetchList({ silent: true });
      if (data.id) window.location.href = `/dashboard/masukan/${data.id}`;
    } else {
      const d = await res.json().catch(() => ({}));
      showMsg("err", d.error || "Gagal kirim masukan");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Masukan</h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">Kirim masukan, pertanyaan, atau laporan bug ke admin</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="text-sm px-3 py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white font-medium transition">
            + Kirim Masukan
          </button>
        )}
      </div>

      {message && (
        <div className={`text-sm px-4 py-2 rounded-lg ${message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-white/50">Judul</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Singkat dan jelas, mis. 'Bug di halaman router'"
              className="w-full mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-white/50">Isi pesan</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Jelasin masukannya di sini..."
              className="w-full mt-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-orange resize-none"
            />
            <div className="text-[10px] text-gray-400 dark:text-white/30 text-right mt-0.5">{body.length}/5000</div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setSubject(""); setBody(""); }} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-medium text-gray-600 dark:text-white/60 transition">
              Batal
            </button>
            <button type="submit" disabled={sending} className="px-4 py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker disabled:opacity-50 text-white text-sm font-medium transition">
              {sending ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Belum ada masukan</div>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-white/5">
            {items.map((f) => (
              <li key={f.id}>
                <a
                  href={`/dashboard/masukan/${f.id}`}
                  className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition ${f.unreadCount > 0 ? "bg-blue-50/40 dark:bg-blue-500/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium truncate ${f.unreadCount > 0 ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-white/70"}`}>
                          {f.subject}
                        </p>
                        {f.status === "RESOLVED" && (
                          <span className="text-[10px] px-2 py-0 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40">Selesai</span>
                        )}
                      </div>
                      {f.lastMessage && (
                        <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 line-clamp-1">
                          {f.lastMessage.fromRole === "ADMIN" ? "Admin: " : "Kamu: "}{f.lastMessage.body}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] text-gray-400 dark:text-white/30">
                        {new Date(f.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
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
    </div>
  );
}
