"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = { id: string; time: string; topics: string; message: string };

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-orange";

const TOPIC_PRESETS: { value: string; label: string }[] = [
  { value: "hotspot", label: "Hotspot" },
  { value: "ppp", label: "PPP" },
  { value: "dhcp", label: "DHCP" },
  { value: "wireless", label: "Wireless" },
  { value: "system", label: "System" },
  { value: "error", label: "Error" },
  { value: "", label: "Semua Topik" },
];

export default function HotspotLogPanel({ routerId }: { routerId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [meta, setMeta] = useState<{ total: number; displayed: number }>({ total: 0, displayed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ topic: "hotspot", search: "", limit: 300 });
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (filter.topic) q.set("topic", filter.topic);
      if (filter.search) q.set("search", filter.search);
      q.set("limit", String(filter.limit));
      const res = await fetch(`/api/account/router/${routerId}/log?${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setEntries([]); }
      else {
        setEntries((json.data?.entries ?? []) as Entry[]);
        setMeta({ total: json.data?.total ?? 0, displayed: json.data?.displayed ?? 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId, filter.topic, filter.search, filter.limit]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchData(); });
    return () => { cancelled = true; };
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "hidden") void fetchData();
    }, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchData]);

  const topicColor = (topics: string) => {
    if (/error|critical|warning/i.test(topics)) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10";
    if (/hotspot/i.test(topics)) return "text-brand-orange dark:text-brand-orange bg-brand-orange-50 dark:bg-brand-orange/10";
    if (/ppp/i.test(topics)) return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10";
    if (/dhcp/i.test(topics)) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10";
    return "text-gray-600 dark:text-white/50 bg-gray-100 dark:bg-white/5";
  };

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            <span>Log</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">
              ({meta.displayed}{meta.total !== meta.displayed ? `/${meta.total}` : ""})
            </span>
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-white/60">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh 5s
            </label>
            <button onClick={fetchData} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium" title="Refresh">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={filter.topic} onChange={(e) => setFilter((f) => ({ ...f, topic: e.target.value }))} className={inputClass}>
              {TOPIC_PRESETS.map((t) => <option key={t.value || "all"} value={t.value}>{t.label}</option>)}
            </select>
            <input
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder="Cari isi pesan log..."
              className={inputClass}
            />
            <select value={filter.limit} onChange={(e) => setFilter((f) => ({ ...f, limit: parseInt(e.target.value, 10) }))} className={inputClass}>
              <option value={100}>100 entri</option>
              <option value={300}>300 entri</option>
              <option value={500}>500 entri</option>
              <option value={1000}>1000 entri</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-white/40 mt-2">
            Log RouterOS umumnya hanya menyimpan ~1000 entri terakhir (in-memory). Untuk log historikal, aktifkan disk logging di router.
          </p>
        </div>

        {loading && entries.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : entries.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Tidak ada log yang cocok.</p>
        ) : (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold w-24">Time</th>
                  <th className="text-left px-4 py-2 font-semibold w-36">Topics</th>
                  <th className="text-left px-4 py-2 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-1.5 font-mono text-gray-500 dark:text-white/50 whitespace-nowrap align-top">{e.time}</td>
                    <td className="px-4 py-1.5 align-top">
                      <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded ${topicColor(e.topics)}`}>{e.topics}</span>
                    </td>
                    <td className="px-4 py-1.5 text-gray-700 dark:text-white/70 font-mono whitespace-pre-wrap break-words">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
