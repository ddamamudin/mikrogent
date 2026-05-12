"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  firstName: string;
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
  | "active"
  | "ending"
  | "ended"
  | "error";

function fmt(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function VoiceCallModal({ firstName, limitSeconds, initialUsedSeconds, onClose, onUsageUpdate }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportedRef = useRef(false);

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
    } catch {
      // best-effort
    }
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

  const endCall = useCallback(async () => {
    setStatus("ending");
    const elapsedSec = startedAtRef.current
      ? Math.ceil((Date.now() - startedAtRef.current) / 1000)
      : elapsed;
    cleanup();
    if (elapsedSec > 0) {
      await reportUsage(elapsedSec);
    }
    setStatus("ended");
  }, [cleanup, elapsed, reportUsage]);

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

    const remainingFromServer = sessionData.remainingSeconds;
    const hardCapSeconds = Math.min(remainingFromServer, sessionData.dailyLimitSeconds);

    setStatus("connecting");

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Output audio
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioElRef.current = audioEl;
    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0];
    };

    // Mic track
    const micTrack = stream.getAudioTracks()[0];
    if (micTrack) pc.addTrack(micTrack, stream);

    // Data channel for events
    const dc = pc.createDataChannel("oai-events");
    dataChannelRef.current = dc;

    let assistantBuf = "";
    dc.addEventListener("message", (e) => {
      let evt: { type?: string; transcript?: string; delta?: string };
      try { evt = JSON.parse(e.data); } catch { return; }

      // Streaming text from assistant
      if (evt.type === "response.output_audio_transcript.delta" && typeof evt.delta === "string") {
        assistantBuf += evt.delta;
        setTranscript(assistantBuf);
        setAgentSpeaking(true);
      } else if (evt.type === "response.output_audio_transcript.done" && typeof evt.transcript === "string") {
        assistantBuf = evt.transcript;
        setTranscript(assistantBuf);
      } else if (evt.type === "response.done" || evt.type === "response.completed") {
        setAgentSpeaking(false);
      } else if (evt.type === "input_audio_buffer.speech_started") {
        setAgentSpeaking(false);
      } else if (evt.type === "response.created") {
        assistantBuf = "";
        setTranscript("");
      }
    });

    let offer: RTCSessionDescriptionInit;
    try {
      offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat offer WebRTC";
      setError(msg);
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
      const msg = e instanceof Error ? e.message : "Gagal koneksi ke OpenAI";
      setError(msg);
      setStatus("error");
      cleanup();
      return;
    }

    if (!sdpRes.ok) {
      const txt = await sdpRes.text().catch(() => "");
      setError(`OpenAI menolak SDP (HTTP ${sdpRes.status}): ${txt.slice(0, 120)}`);
      setStatus("error");
      cleanup();
      return;
    }

    const answerSdp = await sdpRes.text();
    try {
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal apply jawaban SDP";
      setError(msg);
      setStatus("error");
      cleanup();
      return;
    }

    setStatus("active");
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(secs);
      if (secs >= hardCapSeconds) {
        endCall();
      }
    }, 500);
  }, [cleanup, endCall]);

  // Start otomatis saat modal dibuka
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

  const closeModal = async () => {
    if (status === "active" || status === "connecting") {
      await endCall();
    }
    onClose();
  };

  const statusLabel = (() => {
    switch (status) {
      case "requesting-mic": return "Minta izin mikrofon...";
      case "minting": return "Menyiapkan sesi...";
      case "connecting": return "Menyambungkan...";
      case "active": return agentSpeaking ? "Replay Agent sedang bicara..." : "Mendengarkan...";
      case "ending": return "Mengakhiri panggilan...";
      case "ended": return "Panggilan berakhir";
      case "error": return "Terjadi kesalahan";
      default: return "";
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
        <div className="text-xs text-gray-500 uppercase tracking-wider">Voice Call</div>

        <div className="relative flex items-center justify-center w-32 h-32">
          {status === "active" && (
            <>
              <span className={`absolute inset-0 rounded-full ${agentSpeaking ? "bg-blue-400/30 animate-ping" : "bg-gray-200/40"}`} />
              <span className={`absolute inset-2 rounded-full ${agentSpeaking ? "bg-blue-400/40" : "bg-gray-200/60"}`} />
            </>
          )}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-semibold">
            {firstName.slice(0, 1).toUpperCase()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">Replay Agent</div>
          <div className="text-sm text-gray-500 mt-0.5">{statusLabel}</div>
        </div>

        {status === "active" && (
          <div className="flex items-center gap-2 text-sm font-mono">
            <span className="text-gray-900">{fmt(elapsed)}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">sisa {fmt(remaining)}</span>
          </div>
        )}

        {transcript && status === "active" && (
          <div className="w-full max-h-24 overflow-y-auto text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed text-center">
            {transcript}
          </div>
        )}

        {error && (
          <div className="w-full text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-center">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 pt-1">
          {status === "active" && (
            <button
              type="button"
              onClick={toggleMute}
              title={muted ? "Unmute" : "Mute"}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition border-none cursor-pointer ${muted ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          )}

          <button
            type="button"
            onClick={closeModal}
            title={status === "active" ? "Akhiri panggilan" : "Tutup"}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition border-none cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(135deg)" }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
        </div>

        {status === "ended" && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer bg-transparent border-none"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}
