"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = { id: string; fromRole: "USER" | "ADMIN"; fromName: string; body: string; createdAt: string };
type Thread = {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; brand: string | null; validated: boolean; emailVerified: boolean };
  messages: Message[];
};

export default function InboxThreadClient({ feedbackId }: { feedbackId: string }) {
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
    const res = await fetch(`/api/admin/inbox/${feedbackId}`, { cache: "no-store" });
    if (res.ok) setThread(await res.json());
    else if (!opts?.silent) showMsg("err", "Thread tidak ditemukan");
    if (!opts?.silent) setLoading(false);
  }, [feedbackId]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=admin:inbox");
    es.addEventListener("feedback.changed", () => { fetchThread({ silent: true }); });
    return () => { es.close(); };
  }, [fetchThread]);

  // Auto-scroll ke message terbawah pas thread berubah
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages.length]);

  const handleSend = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    const res = await fetch(`/api/admin/inbox/${feedbackId}/reply`, {
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
      showMsg("err", data.error || "Gagal kirim balasan");
    }
  };

  const handleToggleStatus = async () => {
    if (!thread) return;
    const newStatus = thread.status === "OPEN" ? "RESOLVED" : "OPEN";
    const res = await fetch(`/api/admin/inbox/${feedbackId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchThread({ silent: true });
      showMsg("ok", newStatus === "RESOLVED" ? "Thread ditutup" : "Thread dibuka ulang");
    } else showMsg("err", "Gagal ubah status");
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>;
  }
  if (!thread) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-white/40 mb-3">Thread tidak ditemukan</p>
        <Link href="/admin/inbox" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Kembali ke inbox</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <Link href="/admin/inbox" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">← Inbox</Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mt-1 truncate">{thread.subject}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-white/40 flex-wrap">
            <span>{thread.user.name}</span>
            <span className="text-gray-300 dark:text-white/20">·</span>
            <span>{thread.user.email}</span>
            <span className="text-gray-300 dark:text-white/20">·</span>
            <a href={`/admin/tenant/${thread.user.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">Detail tenant</a>
            {thread.status === "RESOLVED" && (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40">Selesai</span>
            )}
          </div>
        </div>
        <button
          onClick={handleToggleStatus}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
            thread.status === "OPEN"
              ? "bg-green-100 dark:bg-green-500/10 hover:bg-green-200 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400"
              : "bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400"
          }`}
        >
          {thread.status === "OPEN" ? "Tandai Selesai" : "Buka Ulang"}
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-2 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-4 space-y-3">
        {thread.messages.map((m) => {
          const isAdmin = m.fromRole === "ADMIN";
          return (
            <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isAdmin
                  ? "bg-brand-orange text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-bl-sm"
              }`}>
                <div className={`text-[10px] mb-1 ${isAdmin ? "text-blue-100" : "text-gray-500 dark:text-white/40"}`}>
                  {m.fromName} · {new Date(m.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-3">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Tulis balasan..."
          rows={3}
          maxLength={5000}
          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-brand-orange resize-none"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-gray-400 dark:text-white/30">{reply.length}/5000</span>
          <button
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker disabled:opacity-50 text-white font-medium transition"
          >
            {sending ? "Mengirim..." : "Kirim Balasan"}
          </button>
        </div>
      </div>
    </div>
  );
}
