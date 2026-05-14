"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Interface = { name: string; type: string; running: boolean; disabled: boolean; comment: string };
type Sample = { ts: number; txBps: number; rxBps: number };

const POLL_MS = 2000;
const WINDOW_SIZE = 30; // 30 sample × 2s = 60s rolling window

function formatBps(b: number): string {
  if (b < 1000) return `${b} bps`;
  if (b < 1_000_000) return `${(b / 1000).toFixed(2)} kbps`;
  if (b < 1_000_000_000) return `${(b / 1_000_000).toFixed(2)} Mbps`;
  return `${(b / 1_000_000_000).toFixed(2)} Gbps`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function TrafficMonitorPanel({ routerId }: { routerId: string }) {
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingIfaces, setLoadingIfaces] = useState(true);
  const [paused, setPaused] = useState(false);

  // Pakai ref biar fetchSample callback gak nge-trigger ulang setInterval
  // tiap state change. selected disimpan di ref, dibaca saat interval tick.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const fetchInterfaces = useCallback(async () => {
    setLoadingIfaces(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/traffic`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal fetch interfaces"); return; }
      const list = (json.data?.interfaces ?? []) as Interface[];
      setInterfaces(list);
      // Default: pilih interface running pertama, fallback ke ether1, fallback ke item pertama
      if (!selectedRef.current && list.length > 0) {
        const def = list.find((i) => i.running && !i.disabled) ?? list.find((i) => i.name === "ether1") ?? list[0];
        setSelected(def.name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingIfaces(false);
    }
  }, [routerId]);

  const fetchSample = useCallback(async () => {
    const iface = selectedRef.current;
    if (!iface) return;
    try {
      const res = await fetch(`/api/account/router/${routerId}/traffic?interface=${encodeURIComponent(iface)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Gagal sample");
        return;
      }
      setError(null);
      const s: Sample = { ts: json.data?.ts ?? Date.now(), txBps: json.data?.txBps ?? 0, rxBps: json.data?.rxBps ?? 0 };
      setSamples((cur) => {
        const next = [...cur, s];
        return next.length > WINDOW_SIZE ? next.slice(next.length - WINDOW_SIZE) : next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [routerId]);

  // Reset samples saat ganti interface
  useEffect(() => {
    setSamples([]);
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchInterfaces(); });
    return () => { cancelled = true; };
  }, [fetchInterfaces]);

  // Polling loop
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (pausedRef.current) return;
      if (document.visibilityState === "hidden") return;
      if (!selectedRef.current) return;
      void fetchSample();
    };
    queueMicrotask(tick);
    const t = setInterval(tick, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchSample]);

  const latest = samples[samples.length - 1] ?? { txBps: 0, rxBps: 0, ts: 0 };
  const maxTx = Math.max(0, ...samples.map((s) => s.txBps));
  const maxRx = Math.max(0, ...samples.map((s) => s.rxBps));
  const peakAxis = Math.max(maxTx, maxRx, 1000);

  const chartData = samples.map((s) => ({
    time: formatTime(s.ts),
    tx: s.txBps,
    rx: s.rxBps,
  }));

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>Traffic Monitor</span>
            {selected && <span className="text-xs font-normal text-gray-400 dark:text-white/30">({selected})</span>}
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${paused ? "text-gray-400 dark:text-white/30" : "text-green-600 dark:text-green-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${paused ? "bg-gray-400" : "bg-green-500 animate-pulse"}`} />
              {paused ? "Paused" : `Polling ${POLL_MS / 1000}s`}
            </span>
            <button onClick={() => setPaused((p) => !p)} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium">
              {paused ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              )}
              {paused ? "Resume" : "Pause"}
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button onClick={fetchInterfaces} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium" title="Reload interfaces">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Reload
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40 font-semibold">Interface</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loadingIfaces}
            className="mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-50"
          >
            {loadingIfaces && <option>Memuat...</option>}
            {!loadingIfaces && interfaces.length === 0 && <option>Belum ada interface</option>}
            {interfaces.map((i) => (
              <option key={i.name} value={i.name}>
                {i.name} {i.running ? "" : "(down)"}{i.disabled ? " (disabled)" : ""}{i.type ? ` · ${i.type}` : ""}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mx-5 mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Live cards: TX + RX current + peak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
          <div className="rounded-lg border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-semibold">TX (upload)</p>
            <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mt-1 font-mono">{formatBps(latest.txBps)}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">RX (download)</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 font-mono">{formatBps(latest.rxBps)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40 font-semibold">Peak TX</p>
            <p className="text-base font-bold text-gray-700 dark:text-white/70 mt-1 font-mono">{formatBps(maxTx)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40 font-semibold">Peak RX</p>
            <p className="text-base font-bold text-gray-700 dark:text-white/70 mt-1 font-mono">{formatBps(maxRx)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="px-5 pb-5">
          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3" style={{ height: 360 }}>
            {samples.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-white/30">
                {selected ? "Menunggu sampel pertama..." : "Pilih interface dulu"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradRx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#94a3b8" strokeOpacity={0.3} />
                  <YAxis
                    domain={[0, peakAxis * 1.1]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    stroke="#94a3b8"
                    strokeOpacity={0.3}
                    tickFormatter={formatBps}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#cbd5e1" }}
                    itemStyle={{ color: "#e2e8f0" }}
                    formatter={(value, name) => [formatBps(Number(value) || 0), String(name).toUpperCase()]}
                  />
                  <Area type="monotone" dataKey="tx" stroke="#06b6d4" strokeWidth={2} fill="url(#gradTx)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="rx" stroke="#10b981" strokeWidth={2} fill="url(#gradRx)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-white/30 mt-2 text-center">
            Window {WINDOW_SIZE} sampel terakhir &middot; refresh tiap {POLL_MS / 1000}s &middot; pakai <code>/interface/monitor-traffic once</code> ala Mikhmon
          </p>
        </div>
      </div>
    </div>
  );
}
