"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type User = { name: string; password: string; profile: string; comment: string };
type Profile = { name: string; validity: string; price: string; sprice: string };

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-orange";

type Batch = {
  comment: string;
  profile: string;
  users: User[];
};

export default function QuickPrintPanel({ routerId, routerName }: { routerId: string; routerName: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cols, setCols] = useState(3);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, pRes] = await Promise.all([
        fetch(`/api/account/router/${routerId}/hotspot/users`, { cache: "no-store" }),
        fetch(`/api/account/router/${routerId}/hotspot/profiles`, { cache: "no-store" }),
      ]);
      const uJson = await uRes.json();
      const pJson = await pRes.json();
      if (!uRes.ok) { setError(uJson?.error ?? "Gagal fetch user"); return; }
      setUsers((uJson.data?.users ?? []) as User[]);
      setProfiles((pJson.data?.profiles ?? []) as Profile[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchData(); });
    return () => { cancelled = true; };
  }, [fetchData]);

  const batches = useMemo<Batch[]>(() => {
    const map = new Map<string, Batch>();
    for (const u of users) {
      const tag = u.comment.trim() || "(tanpa batch)";
      const key = `${tag}__${u.profile}`;
      if (!map.has(key)) map.set(key, { comment: tag, profile: u.profile, users: [] });
      map.get(key)!.users.push(u);
    }
    return Array.from(map.values()).sort((a, b) => b.users.length - a.users.length);
  }, [users]);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => m.set(p.name, p));
    return m;
  }, [profiles]);

  const filtered = batches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.comment.toLowerCase().includes(q) || b.profile.toLowerCase().includes(q);
  });

  const handlePrint = (batch: Batch) => {
    const prof = profileMap.get(batch.profile);
    const price = prof?.sprice && prof.sprice !== "0" ? prof.sprice : prof?.price ?? "0";
    const validity = prof?.validity || "-";

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Popup diblokir. Izinkan popup untuk site ini.");
      return;
    }

    const colWidth = Math.floor(100 / cols) - 1;
    const cards = batch.users.map((u) => `
      <div class="card">
        <div class="header">${escapeHtml(routerName)}</div>
        <div class="user-label">User</div>
        <div class="user-value">${escapeHtml(u.name)}</div>
        <div class="user-label">Password</div>
        <div class="user-value">${escapeHtml(u.password || u.name)}</div>
        <div class="meta">
          <span>${escapeHtml(validity)}</span>
          ${price !== "0" ? `<span class="price">Rp ${Number(price).toLocaleString("id-ID")}</span>` : ""}
        </div>
        <div class="profile-tag">${escapeHtml(batch.profile)}</div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Voucher ${escapeHtml(batch.comment)}</title>
<style>
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  body { margin: 0; padding: 16px; background: #f5f5f5; }
  .toolbar { position: sticky; top: 0; background: #fff; padding: 12px; margin-bottom: 16px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }
  .toolbar h1 { margin: 0; font-size: 14px; }
  .toolbar button { background: #2563eb; color: #fff; border: 0; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 8px; }
  .card { background: #fff; border: 1px dashed #999; padding: 10px; border-radius: 4px; page-break-inside: avoid; text-align: center; min-height: 130px; }
  .header { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .user-label { font-size: 8px; color: #999; text-transform: uppercase; margin-top: 4px; }
  .user-value { font-size: 16px; font-weight: 700; font-family: "Courier New", monospace; letter-spacing: 1px; }
  .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #666; }
  .price { font-weight: 700; color: #16a34a; }
  .profile-tag { font-size: 9px; color: #999; margin-top: 4px; }
  @media print {
    body { background: #fff; padding: 8px; }
    .toolbar { display: none; }
    .grid { gap: 4px; }
    .card { border: 1px dashed #666; }
  }
</style>
</head><body>
<div class="toolbar">
  <h1>${escapeHtml(batch.comment)} &middot; ${batch.users.length} voucher &middot; ${escapeHtml(batch.profile)}</h1>
  <button onclick="window.print()">Cetak</button>
</div>
<div class="grid">${cards}</div>
<script>setTimeout(() => window.print(), 400);</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>Quick Print Voucher</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({filtered.length} batch)</span>
          </h2>
          <button onClick={fetchData} className="text-xs text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium inline-flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari batch / profile..." className={inputClass} />
            <select value={cols} onChange={(e) => setCols(parseInt(e.target.value, 10))} className={inputClass}>
              <option value={2}>2 kolom per halaman</option>
              <option value={3}>3 kolom per halaman</option>
              <option value={4}>4 kolom per halaman</option>
              <option value={5}>5 kolom per halaman</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-white/40 mt-2">
            Voucher di-group berdasarkan <strong>comment</strong> (batch tag) dan <strong>profile</strong>. Klik <strong>Print</strong> buat buka layout printable di tab baru, lalu Ctrl+P.
          </p>
        </div>

        {loading && batches.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada voucher. Generate dulu di menu Voucher.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filtered.map((b) => {
              const prof = profileMap.get(b.profile);
              const price = prof?.sprice && prof.sprice !== "0" ? prof.sprice : prof?.price ?? "0";
              return (
                <div key={`${b.comment}-${b.profile}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{b.comment}</p>
                    <p className="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">
                      <span className="font-medium">{b.users.length}</span> voucher &middot; profile <span className="font-mono">{b.profile}</span>
                      {prof?.validity && <> &middot; validity <span className="font-mono">{prof.validity}</span></>}
                      {price !== "0" && <> &middot; <span className="text-green-600 dark:text-green-400 font-semibold">Rp {Number(price).toLocaleString("id-ID")}</span></>}
                    </p>
                  </div>
                  <button onClick={() => handlePrint(b)} className="ml-3 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white font-medium inline-flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
