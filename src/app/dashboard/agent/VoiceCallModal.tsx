"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  limitSeconds: number;
  initialUsedSeconds: number;
  onClose: () => void;
  onUsageUpdate: (usedSeconds: number) => void;
}

type Status =
  | "idle"
  | "requesting-mic"
  | "minting"
  | "connecting"
  | "listening"        // siap menerima suara user
  | "user-speaking"    // VAD deteksi suara user
  | "responding"       // agent lagi ngomong
  | "tool"             // lagi eksekusi tool
  | "ending"
  | "error";

function fmt(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function VoiceCallModal({
  limitSeconds,
  initialUsedSeconds,
  onClose,
  onUsageUpdate,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toolLabel, setToolLabel] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportedRef = useRef(false);

  // Tools: map callId → name (dipakai pas function_call_arguments.done biar tau nama tool)
  const toolNamesRef = useRef<Map<string, string>>(new Map());

  // Penanda: agent mau hangup setelah farewell selesai
  const pendingHangupRef = useRef(false);
  // Penanda: sapaan awal udah di-trigger (cegah double-send)
  const greetingTriggeredRef = useRef(false);

  const remaining = Math.max(0, limitSeconds - initialUsedSeconds - elapsed);

  const reportUsage = useCallback(async (seconds: number) => {
    if (reportedRef.current) return;
    if (seconds <= 0) return;
    reportedRef.current = true;
    try {
      const res = await fetch("/api/agent/voice/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.usedSeconds != null) onUsageUpdate(data.usedSeconds);
      }
    } catch {}
  }, [onUsageUpdate]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { dataChannelRef.current?.close(); } catch {}
    dataChannelRef.current = null;
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) {
        try { t.stop(); } catch {}
      }
      localStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
  }, []);

  const sendEvent = useCallback((evt: Record<string, unknown>) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== "open") return;
    try { dc.send(JSON.stringify(evt)); } catch {}
  }, []);

  const handleToolCall = useCallback(async (callId: string, name: string, argsStr: string) => {
    // Tool spesial: end_call → tutup panggilan setelah agent selesai pamit
    if (name === "end_call") {
      pendingHangupRef.current = true;
      // Acknowledge ke server, tapi JANGAN trigger response.create - agent gak perlu ngomong lagi
      sendEvent({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: "ok" },
      });
      return;
    }

    setStatus("tool");
    setToolLabel(name === "execute_mikrotik_command" ? "Cek MikroTik..." : name === "verify_and_connect" ? "Konek MikroTik..." : "Eksekusi tool...");
    let output = "ERROR: gagal eksekusi tool";
    try {
      const res = await fetch("/api/agent/voice/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: argsStr }),
      });
      const data = await res.json().catch(() => null);
      output = data?.output ?? output;
    } catch (e) {
      output = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
    sendEvent({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output },
    });
    sendEvent({ type: "response.create" });
    setToolLabel("");
  }, [sendEvent]);

  const endCall = useCallback(async () => {
    setStatus("ending");
    const elapsedSec = startedAtRef.current
      ? Math.ceil((Date.now() - startedAtRef.current) / 1000)
      : elapsed;
    cleanup();
    if (elapsedSec > 0) {
      await reportUsage(elapsedSec);
    }
    onClose();
  }, [cleanup, elapsed, reportUsage, onClose]);

  const start = useCallback(async () => {
    setError("");
    setStatus("requesting-mic");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Tidak bisa akses mikrofon: ${msg}`);
      setStatus("error");
      return;
    }
    localStreamRef.current = stream;

    setStatus("minting");
    let sessionData: { ephemeralKey: string; model: string; remainingSeconds: number; dailyLimitSeconds: number };
    try {
      const res = await fetch("/api/agent/voice/session", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      sessionData = await res.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memulai sesi";
      setError(msg);
      setStatus("error");
      cleanup();
      return;
    }

    const hardCapSeconds = Math.min(sessionData.remainingSeconds, sessionData.dailyLimitSeconds);

    setStatus("connecting");

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioElRef.current = audioEl;
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

    const micTrack = stream.getAudioTracks()[0];
    if (micTrack) pc.addTrack(micTrack, stream);

    const dc = pc.createDataChannel("oai-events");
    dataChannelRef.current = dc;

    const triggerGreeting = () => {
      if (greetingTriggeredRef.current) return;
      greetingTriggeredRef.current = true;
      try { dc.send(JSON.stringify({ type: "response.create" })); } catch {}
    };

    dc.addEventListener("message", (e) => {
      let evt: Record<string, unknown>;
      try { evt = JSON.parse(e.data); } catch { return; }
      const type = evt.type as string | undefined;
      if (!type) return;

      // Session ready → agent nyapa duluan
      if (type === "session.created" || type === "session.updated") {
        triggerGreeting();
        return;
      }

      if (type === "input_audio_buffer.speech_started") {
        // Kalau user ngomong sebelum sapaan trigger, tandai aja udah jalan biar gak double
        greetingTriggeredRef.current = true;
        setStatus("user-speaking");
        return;
      }

      if (type === "response.created") {
        greetingTriggeredRef.current = true;
        setStatus("responding");
        return;
      }

      // Function call lifecycle
      if (type === "response.output_item.added") {
        const item = evt.item as { type?: string; call_id?: string; name?: string } | undefined;
        if (item?.type === "function_call" && item.call_id && item.name) {
          toolNamesRef.current.set(item.call_id, item.name);
        }
        return;
      }
      if (type === "response.function_call_arguments.done") {
        const callId = evt.call_id as string | undefined;
        const argsStr = (evt.arguments as string) ?? "{}";
        const name = (evt.name as string | undefined) ?? (callId ? toolNamesRef.current.get(callId) : undefined);
        if (callId && name) {
          handleToolCall(callId, name, argsStr);
        }
        return;
      }

      if (type === "response.done" || type === "response.cancelled") {
        if (pendingHangupRef.current) {
          // Agent udah selesai pamit, hangup sekarang
          pendingHangupRef.current = false;
          endCall();
          return;
        }
        setStatus((cur) => (cur === "tool" ? cur : "listening"));
        return;
      }

      if (type === "error") {
        const errInfo = evt.error as { message?: string; code?: string } | undefined;
        const msg = errInfo?.message ?? "";
        // Race condition yg gak fatal - agent udah / lagi ngomong, gak perlu kasih tau user
        if (
          msg.includes("active response in progress") ||
          msg.includes("already has an active response") ||
          errInfo?.code === "conversation_already_has_active_response"
        ) {
          return;
        }
        setError(`OpenAI: ${msg || "unknown"}`);
      }
    });

    let offer: RTCSessionDescriptionInit;
    try {
      offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat offer");
      setStatus("error");
      cleanup();
      return;
    }

    let sdpRes: Response;
    try {
      sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${sessionData.ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal koneksi");
      setStatus("error");
      cleanup();
      return;
    }

    if (!sdpRes.ok) {
      const txt = await sdpRes.text().catch(() => "");
      setError(`SDP HTTP ${sdpRes.status}: ${txt.slice(0, 120)}`);
      setStatus("error");
      cleanup();
      return;
    }

    const answerSdp = await sdpRes.text();
    try {
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal apply SDP");
      setStatus("error");
      cleanup();
      return;
    }

    setStatus("listening");
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(secs);
      if (secs >= hardCapSeconds) {
        endCall();
      }
    }, 500);
  }, [cleanup, endCall, handleToolCall]);

  useEffect(() => {
    start();
    return () => {
      const elapsedSec = startedAtRef.current
        ? Math.ceil((Date.now() - startedAtRef.current) / 1000)
        : 0;
      cleanup();
      if (elapsedSec > 0) reportUsage(elapsedSec);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    for (const t of stream.getAudioTracks()) t.enabled = !next;
    setMuted(next);
  };

  const statusLabel = (() => {
    switch (status) {
      case "requesting-mic": return "Mengakses mikrofon...";
      case "minting": return "Memanggil...";
      case "connecting": return "Memanggil...";
      case "listening": return "Mendengarkan...";
      case "user-speaking": return "Aku dengerin nih...";
      case "responding": return "Aku lagi ngomong...";
      case "tool": return toolLabel || "Cek mikrotik...";
      case "ending": return "Mengakhiri panggilan...";
      case "error": return "Terjadi kesalahan";
      default: return "Memanggil...";
    }
  })();

  const isUserSpeaking = status === "user-speaking";
  const isAgentSpeaking = status === "responding" || status === "tool";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8 pt-16">
      <div className="text-xs uppercase tracking-widest text-white/40">Voice Call</div>

      <div className="flex flex-col items-center gap-8 flex-1 justify-center">
        {/* Avatar: agent-logo dengan pulse */}
        <div className="relative flex items-center justify-center w-64 h-64">
          {(isAgentSpeaking || isUserSpeaking) && (
            <>
              <span className={`absolute inset-0 rounded-full ${isUserSpeaking ? "bg-emerald-400/20" : "bg-blue-400/20"} animate-ping`} />
              <span className={`absolute inset-6 rounded-full ${isUserSpeaking ? "bg-emerald-400/30" : "bg-blue-400/30"}`} />
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/agent-logo.png"
            alt="LintasAgent"
            className="relative w-48 h-48 object-contain drop-shadow-2xl"
          />
        </div>

        <div className="text-center">
          <div className="text-2xl font-semibold">LintasAgent</div>
          <div className="text-sm text-white/60 mt-2">{statusLabel}</div>
        </div>

        {status === "listening" || status === "user-speaking" || status === "responding" || status === "tool" ? (
          <div className="text-sm font-mono text-white/50">
            {fmt(elapsed)} <span className="text-white/30">/ sisa {fmt(remaining)}</span>
          </div>
        ) : null}

        {error && (
          <div className="max-w-md text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6 pb-4">
        <button
          type="button"
          onClick={toggleMute}
          disabled={status !== "listening" && status !== "user-speaking" && status !== "responding" && status !== "tool"}
          title={muted ? "Unmute" : "Mute"}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${muted ? "bg-yellow-400 text-yellow-900" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {muted ? (
              <>
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </>
            )}
          </svg>
        </button>

        <button
          type="button"
          onClick={endCall}
          title="Akhiri panggilan"
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition border-none cursor-pointer shadow-xl"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(135deg)" }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
