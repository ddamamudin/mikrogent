"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  rawDate: string;
  date: string | null;
  time: string;
  user: string;
  price: number;
  address: string;
  mac: string;
  validity: string;
  profile: string;
  comment: string;
};

type Summary = { totalRevenue: number; count: number; avgPrice: number; unparsable: number };
type Daily = { date: string; count: number; revenue: number };
type ByProfile = { profile: string; count: number; revenue: number };

type Report = {
  summary: Summary;
  daily: Daily[];
  byProfile: ByProfile[];
  entries: Entry[];
};

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500";

function rupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${y}-${pad(m + 1)}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${pad(m + 1)}-${pad(last)}`;
  return { from, to };
}

export default function SellingReportPanel({ routerId }: { routerId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ ...thisMonthRange(), profile: "", prefix: "" });
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupDate, setCleanupDate] = useState("");
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (filter.from) q.set("from", filter.from);
      if (filter.to) q.set("to", filter.to);
      if (filter.profile.trim()) q.set("profile", filter.profile.trim());
      if (filter.prefix.trim()) q.set("prefix", filter.prefix.trim());
      const res = await fetch(`/api/account/router/${routerId}/hotspot/selling-report?${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setReport(null); }
      else setReport(json.data as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId, filter.from, filter.to, filter.profile, filter.prefix]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchData(); });
    return () => { cancelled = true; };
  }, [fetchData]);

  const maxDailyRevenue = useMemo(() => {
    if (!report) return 0;
    return Math.max(1, ...report.daily.map((d) => d.revenue));
  }, [report]);

  const confirmCleanup = async () => {
    if (!cleanupDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      showMsg("err", "Format tanggal salah");
      return;
    }
    setCleanupBusy(true);
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/selling-report`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThan: cleanupDate }),
      });
      const j = await res.json();
      if (!res.ok) { showMsg("err", j?.error ?? "Gagal"); return; }
      showMsg("ok", `${j.data?.deleted ?? 0} log lama dihapus`);
      setCleanupOpen(false);
      setCleanupDate("");
      fetchData();
    } finally {
      setCleanupBusy(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const header = "Tanggal,Waktu,Username,Profile,Harga,IP,MAC,Validity,Comment";
    const rows = report.entries.map((e) => [
      e.date ?? e.rawDate,
      e.time,
      e.user,
      e.profile,
      e.price,
      e.address,
      e.mac,
      e.validity,
      e.comment.replace(/,/g, ";"),
    ].join(","));
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selling-report-${filter.from}-${filter.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {/* Disclaimer Mikhmon v3 */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <p className="font-semibold mb-0.5">Sync revenue hanya kerja dengan Mikhmon v3</p>
          <p className="leading-snug opacity-90">
            Voucher yang dipakai user akan muncul di sini <strong>hanya kalau profile hotspot-nya dibuat / di-edit dari Mikhmon v3 atau Mikroplay</strong> (expmode <code>remc</code> / <code>ntfc</code>).
            Profile lama dari Mikhmon v2 atau Winbox manual tidak track revenue.
            Voucher juga baru muncul <strong>setelah pelanggan login pertama kali</strong>, bukan saat di-generate.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Report Selling</span>
            {report && <span className="text-xs font-normal text-gray-400 dark:text-white/30">({report.summary.count} transaksi)</span>}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <button onClick={exportCsv} disabled={!report || report.entries.length === 0} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium disabled:opacity-40">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button onClick={() => setCleanupOpen(true)} className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Hapus Log Lama
            </button>
            <span className="text-gray-300 dark:text-white/10">|</span>
            <button onClick={fetchData} className="inline-flex items-center gap-1 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">Dari</label>
              <input type="date" value={filter.from} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">Sampai</label>
              <input type="date" value={filter.to} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">Profile</label>
              <input value={filter.profile} onChange={(e) => setFilter((f) => ({ ...f, profile: e.target.value }))} placeholder="semua" className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">Prefix Username</label>
              <input value={filter.prefix} onChange={(e) => setFilter((f) => ({ ...f, prefix: e.target.value }))} placeholder="semua" className={inputClass} />
            </div>
          </div>
        </div>

        {loading && !report ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : !report ? null : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
              <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-green-700 dark:text-green-400 font-semibold">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{rupiah(report.summary.totalRevenue)}</p>
              </div>
              <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-400 font-semibold">Voucher Terjual</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{report.summary.count.toLocaleString("id-ID")}</p>
              </div>
              <div className="rounded-lg border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-semibold">Rata-rata Harga</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{rupiah(report.summary.avgPrice)}</p>
              </div>
            </div>

            {report.summary.unparsable > 0 && (
              <p className="mx-5 mb-3 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
                ⚠ {report.summary.unparsable} entry di /system/script gak bisa di-parse format Mikhmon (kemungkinan dibuat dari Mikhmon versi lain). Dilewati.
              </p>
            )}

            {/* Daily bar chart (CSS, no dependency) */}
            {report.daily.length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-white/60 mb-2">Revenue Harian</h3>
                <div className="space-y-1">
                  {report.daily.map((d) => {
                    const pct = (d.revenue / maxDailyRevenue) * 100;
                    return (
                      <div key={d.date} className="flex items-center gap-2 text-xs">
                        <span className="w-24 font-mono text-gray-500 dark:text-white/40 shrink-0">{d.date}</span>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-white/5 rounded overflow-hidden relative">
                          <div className="h-full bg-green-400 dark:bg-green-500/40" style={{ width: `${pct}%` }} />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 font-semibold text-gray-800 dark:text-white text-[11px]">{rupiah(d.revenue)}</span>
                        </div>
                        <span className="w-12 text-right text-gray-500 dark:text-white/40 shrink-0 font-mono">{d.count}×</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By profile */}
            {report.byProfile.length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-white/60 mb-2">Per Profile</h3>
                <div className="overflow-x-auto border border-gray-100 dark:border-white/5 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Profile</th>
                        <th className="text-right px-3 py-2 font-semibold">Voucher Terjual</th>
                        <th className="text-right px-3 py-2 font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {report.byProfile.map((p) => (
                        <tr key={p.profile}>
                          <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{p.profile || "-"}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-white/70 font-mono">{p.count.toLocaleString("id-ID")}</td>
                          <td className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-semibold font-mono">{rupiah(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transactions table */}
            <div className="border-t border-gray-100 dark:border-white/5">
              <div className="px-5 py-2 bg-gray-50/50 dark:bg-white/5">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-white/60">Detail Transaksi ({report.entries.length})</h3>
              </div>
              {report.entries.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada transaksi pada rentang ini.</p>
              ) : (
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Tanggal</th>
                        <th className="text-left px-4 py-2 font-semibold">Waktu</th>
                        <th className="text-left px-4 py-2 font-semibold">User</th>
                        <th className="text-left px-4 py-2 font-semibold">Profile</th>
                        <th className="text-right px-4 py-2 font-semibold">Harga</th>
                        <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                      {report.entries.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-1.5 font-mono text-gray-500 dark:text-white/50 whitespace-nowrap">{e.date ?? e.rawDate}</td>
                          <td className="px-4 py-1.5 font-mono text-gray-500 dark:text-white/50 whitespace-nowrap">{e.time}</td>
                          <td className="px-4 py-1.5 font-mono text-gray-900 dark:text-white whitespace-nowrap">{e.user}</td>
                          <td className="px-4 py-1.5 text-gray-700 dark:text-white/70 whitespace-nowrap">{e.profile}</td>
                          <td className="px-4 py-1.5 text-right font-semibold text-green-600 dark:text-green-400 font-mono whitespace-nowrap">{rupiah(e.price)}</td>
                          <td className="px-4 py-1.5 text-gray-500 dark:text-white/50 hidden md:table-cell max-w-[200px] truncate" title={e.comment}>{e.comment || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cleanup modal */}
      {cleanupOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCleanupOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Hapus Log Lama</h3>
            <p className="text-xs text-gray-500 dark:text-white/40">
              Log transaksi disimpan di RouterOS (<code>/system/script ?comment=mikhmon</code>) dan bisa menumpuk seiring waktu. Hapus log SEBELUM tanggal:
            </p>
            <input type="date" value={cleanupDate} onChange={(e) => setCleanupDate(e.target.value)} className={inputClass} />
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              ⚠ Log yang dihapus tidak bisa dikembalikan. Export CSV dulu kalau perlu arsip.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setCleanupOpen(false)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium">Batal</button>
              <button onClick={confirmCleanup} disabled={cleanupBusy || !cleanupDate} className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium">
                {cleanupBusy ? "..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
