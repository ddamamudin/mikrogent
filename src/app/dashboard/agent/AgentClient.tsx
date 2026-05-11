"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiMessage = any;

interface Props {
  userId: string;
  isConnected: boolean;
  hasMemory: boolean;
  agentReady: boolean;
  dailyChatLimit: number;
}

export default function AgentClient({ userId, isConnected, hasMemory, agentReady, dailyChatLimit }: Props) {
  const SK = `agent_${userId}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [chatCount, setChatCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`${SK}_msg`);
      const savedApi = sessionStorage.getItem(`${SK}_api`);
      const savedCount = sessionStorage.getItem(`${SK}_count`);
      if (saved) setMessages(JSON.parse(saved));
      if (savedApi) setApiMessages(JSON.parse(savedApi));
      if (savedCount) setChatCount(parseInt(savedCount, 10));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(`${SK}_msg`, JSON.stringify(messages)); } catch {}
  }, [SK, messages]);
  useEffect(() => {
    try { sessionStorage.setItem(`${SK}_api`, JSON.stringify(apiMessages)); } catch {}
  }, [SK, apiMessages]);
  useEffect(() => {
    try { sessionStorage.setItem(`${SK}_count`, String(chatCount)); } catch {}
  }, [SK, chatCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, toolLabel, streamingText]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    if (chatCount >= dailyChatLimit) {
      setError(`Batas chat harian (${dailyChatLimit}) telah tercapai. Coba lagi besok.`);
      return;
    }

    const newApiMessages: ApiMessage[] = [...apiMessages, { role: "user", content }];
    setMessages((prev) => [...prev, { role: "user", content }]);
    setApiMessages(newApiMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setToolLabel("");
    setStreamingText("");
    setError("");

    let assembled = "";

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMessages }),
      });

      if (!res.ok && !res.body) {
        const txt = await res.text().catch(() => "");
        setError(`HTTP ${res.status}: ${txt.slice(0, 200) || "Stream tidak tersedia"}`);
        return;
      }
      if (!res.body) {
        setError("Stream tidak tersedia");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let evt: { type: string; text?: string; label?: string; error?: string; messages?: ApiMessage[] };
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }

          if (evt.type === "text" && evt.text) {
            assembled += evt.text;
            setStreamingText(assembled);
            setToolLabel("");
          } else if (evt.type === "tool" && evt.label) {
            setToolLabel(evt.label);
          } else if (evt.type === "done" && evt.messages) {
            setApiMessages(evt.messages);
            setChatCount((c) => c + 1);
            setToolLabel("");
            if (assembled) {
              setMessages((prev) => [...prev, { role: "assistant", content: assembled }]);
            }
          } else if (evt.type === "error" && evt.error) {
            setError(evt.error);
            setToolLabel("");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      setToolLabel("");
      setStreamingText("");
    }
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); sendMessage(); }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const isEmpty = messages.length === 0;
  const showStreaming = loading && streamingText.length > 0;
  const showThinking = loading && !streamingText && !toolLabel;

  if (!agentReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Agent Belum Dikonfigurasi</h2>
        <p className="text-sm text-gray-500 dark:text-white/40">Hubungi administrator untuk mengaktifkan fitur AI Agent.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-48px)] -m-6">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-base shrink-0">
            🌐
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">MikroTik AI Agent</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="text-xs text-gray-400 dark:text-white/30">
                {isConnected ? (hasMemory ? "Terhubung · Konfigurasi tersimpan" : "Terhubung") : "Belum terhubung ke MikroTik"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-white/30">{chatCount}/{dailyChatLimit} hari ini</span>
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]); setApiMessages([]); setError(""); setToolLabel(""); setStreamingText("");
                try { sessionStorage.removeItem(`${SK}_msg`); sessionStorage.removeItem(`${SK}_api`); sessionStorage.removeItem(`${SK}_count`); } catch {}
              }}
              className="text-xs text-gray-400 dark:text-white/30 border border-gray-200 dark:border-white/10 rounded-md px-2.5 py-1 hover:text-gray-600 dark:hover:text-white/60 transition"
            >
              Baru
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && !loading ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-3xl mb-4">
              🌐
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">MikroTik AI Agent</h1>
            <p className="text-sm text-gray-500 dark:text-white/40 mb-8 max-w-sm">
              {isConnected
                ? "Tanyakan apa saja tentang router MikroTik kamu."
                : "Hubungkan MikroTik kamu terlebih dahulu, lalu tanyakan apa saja."}
            </p>
            {isConnected && (
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
                {[
                  { icon: "📡", label: "Lihat semua interface", prompt: "Tampilkan semua interface yang ada" },
                  { icon: "🔌", label: "IP Address aktif", prompt: "Tampilkan semua IP address yang terkonfigurasi" },
                  { icon: "📊", label: "Resource sistem", prompt: "Tampilkan penggunaan CPU, RAM, dan uptime router" },
                  { icon: "🛡️", label: "Firewall rules", prompt: "Tampilkan firewall filter rules yang aktif" },
                ].map((s) => (
                  <button key={s.label} onClick={() => sendMessage(s.prompt)}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800 text-left hover:border-blue-400 dark:hover:border-blue-500/50 transition text-sm text-gray-700 dark:text-white/70 font-medium">
                    <div className="text-lg mb-1">{s.icon}</div>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-2">
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-3 py-4 border-b border-gray-100 dark:border-white/5 last:border-0 items-start">
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === "user" ? "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60" : "bg-gradient-to-br from-blue-600 to-violet-600 text-white"}`}>
                  {msg.role === "user" ? "U" : "🌐"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-1.5">
                    {msg.role === "user" ? "Kamu" : "MikroTik Agent"}
                  </p>
                  {msg.role === "assistant" ? (
                    <div className="md prose-sm text-sm text-gray-800 dark:text-white/80 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    <p className="text-sm text-gray-800 dark:text-white/80 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming bubble — shows assistant text live as it arrives */}
            {showStreaming && (
              <div className="flex gap-3 py-4 border-b border-gray-100 dark:border-white/5 items-start">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                  🌐
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-1.5">MikroTik Agent</p>
                  <div className="md prose-sm text-sm text-gray-800 dark:text-white/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }} />
                </div>
              </div>
            )}

            {/* Tool execution indicator */}
            {loading && toolLabel && (
              <div className="flex gap-3 py-3 items-center">
                <div className="w-8 h-8 rounded-lg shrink-0 bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-sm">🌐</div>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-white/30">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500/60"
                        style={{ animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                  {toolLabel}
                </div>
              </div>
            )}

            {/* Thinking indicator — sebelum text pertama, tanpa tool sedang jalan */}
            {showThinking && (
              <div className="flex gap-3 py-4 items-start">
                <div className="w-8 h-8 rounded-lg shrink-0 bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-sm">🌐</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 dark:text-white/30 mb-1.5">MikroTik Agent</p>
                  <div className="pt-1 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/30"
                        style={{ animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="my-3 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-gray-200 dark:border-white/10 px-4 py-3 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex gap-2.5 items-end bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-blue-500 dark:focus-within:border-blue-500/50 transition">
          <textarea ref={textareaRef} value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Tanya tentang router kamu..." : "Ketik 'halo' untuk mulai menghubungkan MikroTik..."}
            rows={1}
            className="flex-1 resize-none border-none outline-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 leading-relaxed min-h-[24px] font-[inherit]"
          />
          <button type="submit" disabled={!input.trim() || loading || chatCount >= dailyChatLimit}
            className={`shrink-0 w-8 h-8 rounded-xl border-none flex items-center justify-center transition text-base ${input.trim() && !loading && chatCount < dailyChatLimit ? "bg-blue-600 text-white cursor-pointer" : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-white/20 cursor-not-allowed"}`}>
            ↑
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 dark:text-white/20 mt-2">Enter kirim · Shift+Enter baris baru</p>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}

function renderMarkdown(raw: string): string {
  let html = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/^\|(.+)\|$/gm, (line) => {
    const cells = line.slice(1, -1).split("|").map((c) => c.trim());
    return "<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>";
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)(\n<tr>[\s\S]*?<\/tr>)*/g, (rows) => {
    const allRows = rows.split("\n").filter((r) => r.startsWith("<tr>"));
    if (allRows.length < 2) return rows;
    const header = allRows[0].replace(/<td>/g, "<th>").replace(/<\/td>/g, "</th>");
    const body = allRows.slice(2).join("");
    return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
  });
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, "<ul>$&</ul>");
  html = html.split("\n\n").map((block) => {
    if (/^<(h[1-3]|ul|ol|li|table|pre|blockquote)/.test(block.trim())) return block;
    const trimmed = block.trim();
    if (!trimmed) return "";
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
  return html;
}
