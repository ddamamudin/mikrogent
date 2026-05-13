"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = { id: string; fromRole: "USER" | "ADMIN"; fromName: string; body: string; createdAt: string };
type Thread = {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

export default function MasukanThreadClient({ feedbackId }: { feedbackId: string }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchThread = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const res = await fetch(`/api/feedback/${feedbackId}`, { cache: "no-store" });
    if (res.ok) setThread(await res.json());
    else if (!opts?.silent) showMsg("err", "Thread tidak ditemukan");
    if (!opts?.silent) setLoading(false);
  }, [feedbackId]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=user:me");
    es.addEventListener("user.feedback_updated", () => { fetchThread({ silent: true }); });
    return () => { es.close(); };
  }, [fetchThread]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread?.messages.length]);

  const handleSend = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    const res = await fetch(`/api/feedback/${feedbackId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (res.ok) {
      setReply("");
      fetchThread({ silent: true });
    } else {
      const data = await res.json().catch(() => ({}));
      showMsg("err", data.error || "Gagal kirim pesan");
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>;
  if (!thread) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-500 mb-3">Thread tidak ditemukan</p>
        <a href="/dashboard/masukan" className="text-sm text-blue-600 hover:underline">← Kembali</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] space-y-3">
      <div>
        <a href="/dashboard/masukan" className="text-xs text-blue-600 hover:underline">← Daftar masukan</a>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{thread.subject}</h1>
        {thread.status === "RESOLVED" && (
          <div className="mt-1 text-xs text-gray-500 dark:text-white/40">Status: <span className="text-gray-700 dark:text-white/60 font-medium">Selesai</span> — admin sudah menutup thread ini. Buat masukan baru kalau perlu lanjut.</div>
        )}
      </div>

      {message && (
        <div className={`text-sm px-4 py-2 rounded-lg ${message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
        {thread.messages.map((m) => {
          const isUser = m.fromRole === "USER";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isUser
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-bl-sm"
              }`}>
                <div className={`text-[10px] mb-1 ${isUser ? "text-blue-100" : "text-gray-500 dark:text-white/40"}`}>
                  {isUser ? "Kamu" : `Admin · ${m.fromName}`} · {new Date(m.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {thread.status === "OPEN" ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Tulis pesan lanjutan..."
            rows={3}
            maxLength={5000}
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-gray-400 dark:text-white/30">{reply.length}/5000</span>
            <button
              onClick={handleSend}
              disabled={sending || !reply.trim()}
              className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition"
            >
              {sending ? "Mengirim..." : "Kirim"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-3 text-center text-xs text-gray-500 dark:text-white/40">
          Thread sudah ditutup. <a href="/dashboard/masukan" className="text-blue-600 hover:underline">Buat masukan baru</a>
        </div>
      )}
    </div>
  );
}
