"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { useAgentSidebar } from "@/components/DashboardLayoutClient";

type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiMessage = any;

interface Props {
  userId: string;
  firstName: string;
  isConnected: boolean;
  hasMemory: boolean;
  agentReady: boolean;
  dailyChatLimit: number;
  initialChatCount: number;
}

function greetingByTime(d: Date = new Date()): string {
  const h = d.getHours();
  if (h >= 4 && h < 11) return "Selamat Pagi";
  if (h >= 11 && h < 15) return "Selamat Siang";
  if (h >= 15 && h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export default function AgentClient({ userId, firstName, isConnected, hasMemory, agentReady, dailyChatLimit, initialChatCount }: Props) {
  const SK = `agent_${userId}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [chatCount, setChatCount] = useState(initialChatCount);
  const [greeting, setGreeting] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);

  const { setState: setAgentSidebar } = useAgentSidebar();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`${SK}_msg`);
      const savedApi = sessionStorage.getItem(`${SK}_api`);
      if (saved) setMessages(JSON.parse(saved));
      if (savedApi) setApiMessages(JSON.parse(savedApi));
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, toolLabel, streamingText]);

  // Hitung greeting di client agar pakai zona waktu user, dan refresh per menit
  useEffect(() => {
    setGreeting(greetingByTime());
    const t = setInterval(() => setGreeting(greetingByTime()), 60_000);
    return () => clearInterval(t);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]); setApiMessages([]); setError(""); setToolLabel(""); setStreamingText("");
    try {
      sessionStorage.removeItem(`${SK}_msg`);
      sessionStorage.removeItem(`${SK}_api`);
    } catch {}
  }, [SK]);

  // Push agent state ke sidebar
  useEffect(() => {
    setAgentSidebar({
      isConnected,
      hasMemory,
      chatCount,
      dailyChatLimit,
      hasMessages: messages.length > 0,
      onReset: resetChat,
    });
    return () => setAgentSidebar(null);
  }, [setAgentSidebar, isConnected, hasMemory, chatCount, dailyChatLimit, messages.length, resetChat]);

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
    streamBufRef.current = "";

    const flushStream = () => {
      rafRef.current = null;
      setStreamingText(streamBufRef.current);
    };
    const scheduleFlush = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flushStream);
    };

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
            streamBufRef.current = assembled;
            scheduleFlush();
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
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLoading(false);
      setToolLabel("");
      setStreamingText("");
      streamBufRef.current = "";
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
      <div className="flex flex-col items-center justify-center h-full py-20 text-center bg-white">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Agent Belum Dikonfigurasi</h2>
        <p className="text-sm text-gray-500">Hubungi administrator untuk mengaktifkan fitur AI Agent.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && !loading ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3 leading-tight">
              {greeting ? `${greeting},` : "Halo,"}<br />Kak {firstName}
            </h1>
            <p className="text-sm text-gray-500 max-w-sm">
              silahkan tanya / perintahkan Aku untuk menjaga / mengelola Mikrotik Kakak ya.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.map((msg, i) => (
              msg.role === "user" ? (
                <div key={i} className="flex justify-end mb-5">
                  <div className="max-w-[85%] sm:max-w-[80%] px-4 py-2.5 bg-gray-100 text-gray-900 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="mb-7">
                  <div className="md prose-sm text-[15px] text-gray-900 leading-relaxed break-words"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                </div>
              )
            ))}

            {showStreaming && (
              <div className="mb-7">
                <div className="md prose-sm text-[15px] text-gray-900 leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingText) }} />
              </div>
            )}

            {loading && toolLabel && (
              <div className="mb-5 flex items-center gap-2 text-sm text-gray-400">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400"
                      style={{ animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                {toolLabel}
              </div>
            )}

            {showThinking && (
              <div className="mb-5 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300"
                    style={{ animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            )}

            {error && (
              <div className="my-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 sm:px-4 pb-3 sm:pb-4 pt-2 bg-white">
        <form onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex gap-2 items-end bg-white border border-gray-200 rounded-3xl px-4 py-3 shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition">
          <textarea ref={textareaRef} value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Kirim pesan ke Replay Agent..." : "Ketik 'halo' untuk mulai..."}
            rows={1}
            className="flex-1 resize-none overflow-hidden border-none outline-none bg-transparent text-[15px] text-gray-900 placeholder-gray-400 leading-relaxed min-h-[24px] font-[inherit]"
          />
          <button type="submit" disabled={!input.trim() || loading || chatCount >= dailyChatLimit}
            className={`shrink-0 w-8 h-8 rounded-full border-none flex items-center justify-center transition text-base ${input.trim() && !loading && chatCount < dailyChatLimit ? "bg-gray-900 text-white cursor-pointer hover:bg-gray-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
            ↑
          </button>
        </form>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        .md p { margin: 0 0 0.75em 0; }
        .md p:last-child { margin-bottom: 0; }
        .md h1, .md h2, .md h3 { font-weight: 600; margin: 1em 0 0.5em; line-height: 1.3; }
        .md h1 { font-size: 1.5em; }
        .md h2 { font-size: 1.25em; }
        .md h3 { font-size: 1.1em; }
        .md ul, .md ol { margin: 0 0 0.75em 0; padding-left: 1.5em; }
        .md li { margin: 0.25em 0; }
        .md code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; word-break: break-word; }
        .md pre { background: #f3f4f6; padding: 12px 14px; border-radius: 8px; overflow-x: auto; margin: 0.5em 0 0.75em; }
        .md pre code { background: none; padding: 0; font-size: 0.875em; word-break: normal; }
        .md .table-wrap { overflow-x: auto; max-width: 100%; margin: 0.5em 0 0.75em; -webkit-overflow-scrolling: touch; }
        .md table { border-collapse: collapse; font-size: 0.9em; }
        .md th, .md td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; white-space: nowrap; }
        .md th { background: #f9fafb; font-weight: 600; }
        .md blockquote { border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280; margin: 0.5em 0 0.75em; }
        .md strong { font-weight: 600; }
      `}</style>
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
    return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
  });
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, "<ul>$&</ul>");
  html = html.split("\n\n").map((block) => {
    if (/^<(h[1-3]|ul|ol|li|table|pre|blockquote|div)/.test(block.trim())) return block;
    const trimmed = block.trim();
    if (!trimmed) return "";
    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
  return html;
}
