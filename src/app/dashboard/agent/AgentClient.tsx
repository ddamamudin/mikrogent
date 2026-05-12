"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { useAgentSidebar } from "@/components/DashboardLayoutClient";
import VoiceCallModal from "./VoiceCallModal";

type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiMessage = any;

interface Attachment {
  name: string;
  data: string; // base64 (no prefix)
  mimeType: string;
  preview: string; // data URL for thumbnail
}

interface Props {
  userId: string;
  firstName: string;
  isConnected: boolean;
  hasMemory: boolean;
  agentReady: boolean;
  dailyChatLimit: number;
  initialChatCount: number;
  initialMessages: Message[];
  initialApiMessages: ApiMessage[];
  voiceCallEnabled: boolean;
  voiceDailyLimitSeconds: number;
  initialVoiceSecondsUsed: number;
}

function greetingByTime(d: Date = new Date()): string {
  const h = d.getHours();
  if (h >= 4 && h < 11) return "Selamat Pagi";
  if (h >= 11 && h < 15) return "Selamat Siang";
  if (h >= 15 && h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export default function AgentClient({ firstName, isConnected, hasMemory, agentReady, dailyChatLimit, initialChatCount, initialMessages, initialApiMessages, voiceCallEnabled, voiceDailyLimitSeconds, initialVoiceSecondsUsed }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialApiMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolLabel, setToolLabel] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState("");
  const [chatCount, setChatCount] = useState(initialChatCount);
  const [greeting, setGreeting] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceSecondsUsed, setVoiceSecondsUsed] = useState(initialVoiceSecondsUsed);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const streamBufRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const assembledRef = useRef<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { setState: setAgentSidebar } = useAgentSidebar();

  const saveSession = useCallback((msgs: Message[], apiMsgs: ApiMessage[]) => {
    fetch("/api/agent/session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, apiMessages: apiMsgs }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, toolLabel, streamingText]);

  // Hitung greeting di client agar pakai zona waktu user, dan refresh per menit
  useEffect(() => {
    setGreeting(greetingByTime());
    const t = setInterval(() => setGreeting(greetingByTime()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const handler = (e: MouseEvent) => {
      const btn = (e.target as Element).closest(".copy-code-btn") as HTMLElement | null;
      if (!btn) return;
      const code = btn.parentElement?.querySelector("code")?.textContent ?? "";
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "✓ Tersalin";
        setTimeout(() => { btn.textContent = "Salin"; }, 2000);
      }).catch(() => {});
    };
    container.addEventListener("click", handler);
    return () => container.removeEventListener("click", handler);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]); setApiMessages([]); setError(""); setToolLabel(""); setStreamingText("");
    setAttachments([]);
    fetch("/api/agent/session", { method: "DELETE" }).catch(() => {});
  }, []);

  // Push agent state ke sidebar
  useEffect(() => {
    setAgentSidebar({
      isConnected,
      hasMemory,
      chatCount,
      dailyChatLimit,
      voiceCallEnabled,
      voiceSecondsUsed,
      voiceDailyLimitSeconds,
      hasMessages: messages.length > 0,
      onReset: resetChat,
    });
    return () => setAgentSidebar(null);
  }, [setAgentSidebar, isConnected, hasMemory, chatCount, dailyChatLimit, voiceCallEnabled, voiceSecondsUsed, voiceDailyLimitSeconds, messages.length, resetChat]);

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

    const snapshot = [...attachments];
    setAttachments([]);

    // Display message includes attachment names so user sees what was sent
    const attachLabels = snapshot.map(a => `📷 ${a.name}`).join("  ");
    const displayContent = snapshot.length > 0 ? `${content}\n${attachLabels}` : content;

    const newApiMessages: ApiMessage[] = [...apiMessages, { role: "user", content }];
    const newMessages: Message[] = [...messages, { role: "user", content: displayContent }];
    setMessages(newMessages);
    setApiMessages(newApiMessages);
    saveSession(newMessages, newApiMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setToolLabel("");
    setStreamingText("");
    setError("");

    assembledRef.current = "";
    streamBufRef.current = "";

    const flushStream = () => {
      rafRef.current = null;
      setStreamingText(streamBufRef.current);
    };
    const scheduleFlush = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(flushStream);
    };

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newApiMessages,
          attachments: snapshot.length > 0
            ? snapshot.map(({ name, data, mimeType }) => ({ name, data, mimeType }))
            : undefined,
        }),
        signal: abort.signal,
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream")) {
        const txt = await res.text().catch(() => "");
        if (res.status === 413) {
          setError("File terlalu besar untuk dikirim. Coba file yang lebih kecil.");
        } else {
          setError(`HTTP ${res.status}: ${txt.slice(0, 200) || "Response tidak valid"}`);
        }
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
            assembledRef.current += evt.text;
            streamBufRef.current = assembledRef.current;
            scheduleFlush();
            setToolLabel("");
          } else if (evt.type === "tool" && evt.label) {
            setToolLabel(evt.label);
          } else if (evt.type === "done" && evt.messages) {
            const doneMessages: ApiMessage[] = evt.messages ?? [];
            setApiMessages(doneMessages);
            setChatCount((c) => c + 1);
            setToolLabel("");
            if (assembledRef.current) {
              const text = assembledRef.current;
              setMessages((prev) => {
                const next = [...prev, { role: "assistant" as Role, content: text }];
                saveSession(next, doneMessages);
                return next;
              });
            } else {
              saveSession(messages, doneMessages);
            }
          } else if (evt.type === "error" && evt.error) {
            setError(evt.error);
            setToolLabel("");
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // User stopped - commit whatever text we have so far
        const partial = assembledRef.current;
        if (partial) {
          setMessages((prev) => [...prev, { role: "assistant" as Role, content: partial }]);
        }
      } else {
        setError(e instanceof Error ? e.message : "Network error");
      }
    } finally {
      abortRef.current = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLoading(false);
      setToolLabel("");
      setStreamingText("");
      streamBufRef.current = "";
      assembledRef.current = "";
    }
  }

  function handleSubmit(e: FormEvent) { e.preventDefault(); sendMessage(); }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }
  function stopStream() { abortRef.current?.abort(); }

  function readFiles(files: FileList) {
    const accept = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const slots = 5 - attachments.length;
    Array.from(files).slice(0, slots).forEach(file => {
      if (!accept.includes(file.type)) {
        setError(`Format "${file.name}" tidak didukung. Hanya gambar (JPG, PNG, GIF, WEBP).`);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError(`File "${file.name}" terlalu besar. Maksimal 2MB per file.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const data = dataUrl.split(",")[1] ?? "";
        setAttachments(prev => [...prev, {
          name: file.name,
          data,
          mimeType: file.type,
          preview: dataUrl,
        }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleImageInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) readFiles(e.target.files);
    e.target.value = "";
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
      <div ref={messagesRef} className="flex-1 overflow-y-auto">
        {isEmpty && !loading ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
            <img src="/agent-logo.png" alt="Replay Agent" className="w-36 h-36 sm:w-44 sm:h-44 mb-5 object-contain" />
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
              <div className="mb-5 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300"
                    style={{ animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
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
        {/* hidden file input */}
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={handleImageInput} />

        <form onSubmit={handleSubmit}
          className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-3xl px-4 py-3 shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition">

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-2 py-1.5 max-w-[160px]">
                  <img src={att.preview} alt={att.name} className="w-7 h-7 rounded object-cover shrink-0" />
                  <span className="text-xs text-gray-700 truncate">{att.name}</span>
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="shrink-0 text-gray-400 hover:text-gray-600 leading-none border-none bg-transparent cursor-pointer p-0 ml-0.5">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Attach button - langsung buka picker gambar */}
            <button type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={attachments.length >= 5}
              title="Lampirkan gambar"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition border-none bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            <textarea ref={textareaRef} value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Kirim pesan ke Replay Agent..." : "Ketik 'halo' untuk mulai..."}
              rows={1}
              className="flex-1 resize-none overflow-hidden border-none outline-none bg-transparent text-[15px] text-gray-900 placeholder-gray-400 leading-relaxed min-h-[24px] font-[inherit]"
            />
            {loading ? (
              <button type="button" onClick={stopStream}
                className="shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center cursor-pointer hover:bg-gray-700 transition border-none">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="1" y="1" width="10" height="10" rx="2"/>
                </svg>
              </button>
            ) : voiceCallEnabled && !input.trim() && attachments.length === 0 ? (
              (() => {
                const voiceRemaining = Math.max(0, voiceDailyLimitSeconds - voiceSecondsUsed);
                const voiceExhausted = voiceRemaining <= 0;
                return (
                  <button type="button"
                    onClick={() => { if (!voiceExhausted) setVoiceModalOpen(true); }}
                    disabled={voiceExhausted}
                    title={voiceExhausted ? "Batas voice harian sudah habis" : `Voice call (${voiceRemaining}s tersisa)`}
                    className={`shrink-0 w-8 h-8 rounded-full border-none flex items-center justify-center transition ${voiceExhausted ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white cursor-pointer hover:bg-gray-700"}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </button>
                );
              })()
            ) : (
              <button type="submit" disabled={(!input.trim() && attachments.length === 0) || chatCount >= dailyChatLimit}
                className={`shrink-0 w-8 h-8 rounded-full border-none flex items-center justify-center transition text-base ${(input.trim() || attachments.length > 0) && chatCount < dailyChatLimit ? "bg-gray-900 text-white cursor-pointer hover:bg-gray-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                ↑
              </button>
            )}
          </div>
        </form>
      </div>

      {voiceModalOpen && (
        <VoiceCallModal
          limitSeconds={voiceDailyLimitSeconds}
          initialUsedSeconds={voiceSecondsUsed}
          onClose={() => setVoiceModalOpen(false)}
          onUsageUpdate={(used) => setVoiceSecondsUsed(used)}
        />
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        .code-wrap { position: relative; }
        .copy-code-btn { position: absolute; top: 8px; right: 8px; background: #e5e7eb; border: none; border-radius: 5px; padding: 3px 10px; font-size: 0.72em; cursor: pointer; color: #374151; font-family: inherit; transition: background 0.15s; }
        .copy-code-btn:hover { background: #d1d5db; }
        .copy-code-btn:active { background: #9ca3af; }
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
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, '<div class="code-wrap"><button class="copy-code-btn">Salin</button><pre><code>$1</code></pre></div>');
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
