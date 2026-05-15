"use client";

import { useEffect, useState } from "react";

// Interface event beforeinstallprompt (Chrome/Edge/Android non-standard)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua); // iOS Safari only
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [iosEligible, setIosEligible] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    setIosEligible(isIos());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (iosEligible) {
      setShowIosModal(true);
    }
  };

  // Tombol cuma muncul kalau: belum installed, dan (browser support prompt) atau (iOS Safari)
  const canShow = !installed && (deferred !== null || iosEligible);
  if (!canShow) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition border border-blue-100"
        title="Install LintasAgent sebagai aplikasi"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Install
      </button>

      {showIosModal && (
        <div
          onClick={() => setShowIosModal(false)}
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl"
          >
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lintasagent-logo.png" alt="LintasAgent" className="h-14 w-14" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">Install LintasAgent</h2>
            <p className="text-sm text-gray-500 text-center mb-5">
              Di iPhone/iPad, install lewat Safari dengan langkah:
            </p>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-orange-50 text-brand-orange text-xs font-bold flex items-center justify-center">1</span>
                <span>
                  Tap tombol <strong>Share</strong>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mx-1 -mt-0.5">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  di bawah/atas Safari.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-orange-50 text-brand-orange text-xs font-bold flex items-center justify-center">2</span>
                <span>Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (Add to Home Screen).</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-orange-50 text-brand-orange text-xs font-bold flex items-center justify-center">3</span>
                <span>Tap <strong>Tambah</strong>. Icon LintasAgent akan muncul di home screen.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIosModal(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
