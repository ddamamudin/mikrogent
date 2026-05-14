"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Host = {
  id: string;
  macAddress: string;
  address: string;
  toAddress: string;
  server: string;
  uptime: string;
  idleTime: string;
  bytesIn: string;
  bytesOut: string;
  authorized: boolean;
  bypassed: boolean;
  dhcp: boolean;
  host: string;
  comment: string;
};

function formatBytes(s: string): string {
  const n = parseInt(s, 10) || 0;
  if (n <= 0) return "0";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white";

export default function HostsPanel({ routerId }: { routerId: string }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Host | null>(null);
  const [bindingTarget, setBindingTarget] = useState<{ host: Host; type: string; comment: string } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchHosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/router/${routerId}/hotspot/hosts`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Gagal"); setHosts([]); }
      else setHosts((json.data?.hosts ?? []) as Host[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void fetchHosts(); });
    return () => { cancelled = true; };
  }, [fetchHosts]);

  const visible = hosts.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.macAddress.toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q) ||
      h.host.toLowerCase().includes(q) ||
      h.comment.toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/hosts/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
    setBusyId(null);
    setPendingDelete(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal"); return; }
    showMsg("ok", "Host dihapus");
    fetchHosts();
  };

  const submitBinding = async () => {
    if (!bindingTarget) return;
    setBusyId(bindingTarget.host.id);
    const res = await fetch(`/api/account/router/${routerId}/hotspot/hosts/${encodeURIComponent(bindingTarget.host.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "make-binding", type: bindingTarget.type, comment: bindingTarget.comment }),
    });
    setBusyId(null);
    if (!res.ok) { const j = await res.json().catch(() => ({})); showMsg("err", j?.error ?? "Gagal bikin binding"); return; }
    setBindingTarget(null);
    showMsg("ok", `Binding ${bindingTarget.type} dibuat untuk ${bindingTarget.host.macAddress}`);
  };

  return (
    <div className="space-y-3">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <span>Hosts</span>
            <span className="text-xs font-normal text-gray-400 dark:text-white/30">({visible.length}{hosts.length !== visible.length ? `/${hosts.length}` : ""})</span>
          </h2>
          <button onClick={fetchHosts} className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari MAC / IP / hostname..." className={inputClass} />
        </div>

        {loading && hosts.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Memuat...</p>
        ) : error ? (
          <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">Belum ada host.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/5 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">MAC</th>
                  <th className="text-left px-4 py-2 font-semibold">IP</th>
                  <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Hostname</th>
                  <th className="text-right px-4 py-2 font-semibold hidden lg:table-cell">Uptime</th>
                  <th className="text-right px-4 py-2 font-semibold hidden lg:table-cell">Idle</th>
                  <th className="text-right px-4 py-2 font-semibold hidden xl:table-cell">RX</th>
                  <th className="text-right px-4 py-2 font-semibold hidden xl:table-cell">TX</th>
                  <th className="text-right px-4 py-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {visible.map((h) => {
                  const isBusy = busyId === h.id;
                  const stateColor = h.bypassed ? "bg-indigo-500" : h.authorized ? "bg-green-500" : "bg-gray-400";
                  const stateLabel = h.bypassed ? "Bypassed" : h.authorized ? "Auth" : "Unauth";
                  return (
                    <tr key={h.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-white/70">
                          <span className={`w-1.5 h-1.5 rounded-full ${stateColor}`} />
                          {stateLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-900 dark:text-white whitespace-nowrap">{h.macAddress}</td>
                      <td className="px-4 py-2 font-mono text-gray-700 dark:text-white/70 whitespace-nowrap">{h.address}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-white/50 hidden md:table-cell max-w-[150px] truncate" title={h.host}>{h.host || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden lg:table-cell whitespace-nowrap">{h.uptime || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden lg:table-cell whitespace-nowrap">{h.idleTime || "-"}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden xl:table-cell whitespace-nowrap">{formatBytes(h.bytesIn)}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 dark:text-white/50 hidden xl:table-cell whitespace-nowrap">{formatBytes(h.bytesOut)}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setBindingTarget({ host: h, type: "bypassed", comment: "" })} disabled={isBusy} title="Convert ke IP Binding" className="text-[11px] px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-500/10 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-400 disabled:opacity-50">
                            → Binding
                          </button>
                          <button onClick={() => setPendingDelete(h)} disabled={isBusy} className="text-[11px] px-2 py-1 rounded bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 dark:text-red-400 disabled:opacity-50">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Make Binding modal */}
      {bindingTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBindingTarget(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Convert ke IP Binding</h3>
            <p className="text-xs text-gray-500 dark:text-white/40">
              MAC <strong className="font-mono">{bindingTarget.host.macAddress}</strong> · IP <strong className="font-mono">{bindingTarget.host.address || "-"}</strong>
            </p>
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Type</label>
              <select value={bindingTarget.type} onChange={(e) => setBindingTarget({ ...bindingTarget, type: e.target.value })} className={inputClass}>
                <option value="bypassed">bypassed (skip login)</option>
                <option value="regular">regular (force login)</option>
                <option value="blocked">blocked (deny)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-white/40">Comment</label>
              <input value={bindingTarget.comment} onChange={(e) => setBindingTarget({ ...bindingTarget, comment: e.target.value })} className={inputClass} placeholder="opsional" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setBindingTarget(null)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 text-sm font-medium">Batal</button>
              <button onClick={submitBinding} disabled={busyId === bindingTarget.host.id} className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium">
                {busyId === bindingTarget.host.id ? "..." : "Bikin Binding"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={pendingDelete ? `Hapus host "${pendingDelete.macAddress}"?` : ""}
        description="Host akan disconnect. Kalau masih aktif di network, akan muncul lagi pas DHCP renew."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={!!pendingDelete && busyId === pendingDelete.id}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
