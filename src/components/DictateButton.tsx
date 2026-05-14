"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type State = "idle" | "recording" | "transcribing";

// Hard cap durasi rekam: 60 detik. Pesan chat biasanya pendek (5-15 detik),
// 60 detik udah > 4x average. Kalau butuh lebih panjang, user tinggal klik
// mic lagi setelah stop — text di-append ke textarea, gak ada limit total.
const MAX_RECORD_MS = 60_000;

export default function DictateButton({
  disabled,
  onText,
  onError,
}: {
  disabled?: boolean;
  onText: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);

  const cleanupTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
  }, []);

  useEffect(() => () => cleanupTracks(), [cleanupTracks]);

  const reportError = useCallback((msg: string) => {
    if (onError) onError(msg);
    else console.error("[dictate]", msg);
  }, [onError]);

  const startRecording = useCallback(async () => {
    if (disabled || state !== "idle") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      reportError("Browser ini gak support rekam audio");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        reportError("Akses mic ditolak. Aktifkan permission mic di browser.");
      } else if (name === "NotFoundError") {
        reportError("Gak ada mic terdeteksi.");
      } else {
        reportError("Gagal akses mic.");
      }
      return;
    }
    streamRef.current = stream;

    // Format: prefer audio/webm (Chrome/Firefox default). Safari iOS pakai mp4.
    let mimeType = "";
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const t of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
    }
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      cleanupTracks();
      reportError("MediaRecorder gak support format audio");
      return;
    }
    recRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    rec.onstop = async () => {
      cleanupTracks();
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || "audio/webm" });
      chunksRef.current = [];
      recRef.current = null;
      if (blob.size === 0) {
        setState("idle");
        return;
      }
      setState("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "audio.webm");
        const res = await fetch("/api/agent/transcribe", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          reportError(data.error || "Gagal transkripsi");
        } else if (data.text) {
          onText(String(data.text).trim());
        }
      } catch (e) {
        reportError(e instanceof Error ? e.message : "Gagal kirim audio");
      } finally {
        setState("idle");
        setElapsed(0);
      }
    };

    rec.start();
    startedAtRef.current = Date.now();
    setElapsed(0);
    setState("recording");

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    autoStopRef.current = setTimeout(() => {
      if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
    }, MAX_RECORD_MS);
  }, [disabled, state, reportError, onText, cleanupTracks]);

  const stopRecording = useCallback(() => {
    const rec = recRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.stop();
  }, []);

  const handleClick = () => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
    // transcribing: gak ngapain (button disabled)
  };

  const baseClass = "shrink-0 w-8 h-8 rounded-full border-none flex items-center justify-center transition cursor-pointer";
  const isBusy = state === "transcribing";

  if (state === "recording") {
    const maxSec = MAX_RECORD_MS / 1000;
    const secs = Math.min(maxSec, elapsed);
    const remaining = Math.max(0, maxSec - secs);
    const nearLimit = remaining <= 10;
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[11px] font-mono tabular-nums ${nearLimit ? "text-red-500" : "text-gray-400"}`}>
          {secs}s
        </span>
        <button
          type="button"
          onClick={handleClick}
          title={`Sedang merekam, klik untuk stop (${remaining}s sampai auto-stop)`}
          className={`${baseClass} bg-red-500 text-white hover:bg-red-600 relative`}
        >
          <span className="absolute inset-0 rounded-full bg-red-500 opacity-60 animate-ping" />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="relative">
            <rect x="2" y="2" width="10" height="10" rx="2" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBusy}
      title={isBusy ? "Transkripsi..." : "Rekam suara"}
      className={`${baseClass} ${
        isBusy
          ? "bg-gray-200 text-gray-400 cursor-wait"
          : disabled
            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent"
      }`}
    >
      {isBusy ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
