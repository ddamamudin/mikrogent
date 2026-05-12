"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Generate notification sound via Web Audio API (no asset file needed)
function playDing() {
  try {
    type WindowWithWebkit = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    const o1 = ctx.createOscillator();
    o1.frequency.value = 880;
    o1.connect(gain);
    o1.start();
    o1.stop(ctx.currentTime + 0.15);
    const o2 = ctx.createOscillator();
    o2.frequency.value = 1320;
    o2.connect(gain);
    o2.start(ctx.currentTime + 0.15);
    o2.stop(ctx.currentTime + 0.6);
  } catch {}
}

function showNotif(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, { body, icon: "/icon-192.png", tag: "mikroplay-tenant" });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}

type Tenant = {
  id: string;
  name: string;
  email: string;
  brand: string | null;
  status: "ACTIVE" | "SUSPENDED";
  emailVerified: boolean;
  validated: boolean;
  createdAt: string;
  chatCount: number;
  userDailyChatLimit: number | null;
  effectiveLimit: number;
};

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default function TenantListClient({ isValidator = false }: { isValidator?: boolean }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [dailyChatLimit, setDailyChatLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [notifReady, setNotifReady] = useState(false);
  const seenIdsRef = useRef<Set<string> | null>(null); // null = belum init

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), q, status });
    const res = await fetch(`/api/admin/tenants?${params}`);
    const data = await res.json();
    const newTenants: Tenant[] = data.tenants ?? [];

    // Deteksi tenant baru (hanya untuk halaman 1, tanpa filter — supaya
    // gak misfire saat user pindah halaman / search)
    if (page === 1 && !q && !status) {
      const prevSeen = seenIdsRef.current;
      if (prevSeen === null) {
        // first load — populate seen tanpa trigger notif
        seenIdsRef.current = new Set(newTenants.map((t) => t.id));
      } else {
        const fresh = newTenants.filter((t) => !prevSeen.has(t.id));
        if (fresh.length > 0) {
          playDing();
          if (fresh.length === 1) {
            const t = fresh[0];
            showNotif("User baru daftar di Mikroplay", `${t.name} (${t.email})`);
          } else {
            showNotif("User baru daftar di Mikroplay", `${fresh.length} pendaftar baru perlu dicek`);
          }
          fresh.forEach((t) => prevSeen.add(t.id));
        }
      }
    }

    setTenants(newTenants);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setDailyChatLimit(data.dailyChatLimit ?? 50);
    setLoading(false);
  }, [page, q, status]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  // Cek permission notifikasi
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifReady(Notification.permission === "granted");
    }
  }, []);

  const enableNotif = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifReady(perm === "granted");
    if (perm === "granted") {
      // test ding biar user tau audio juga jalan
      playDing();
      showNotif("Notifikasi aktif", "Kamu akan dapat alert saat ada user baru daftar.");
    }
  };

  // Auto-refresh tiap 15 detik supaya admin lihat update verifikasi email
  // tenant tanpa harus reload manual. Pause kalau tab di background.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") fetchTenants();
      }, 15000);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { fetchTenants(); start(); }
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [fetchTenants]);

  const handleValidate = async (id: string, newValidated: boolean) => {
    if (newValidated) {
      const t = tenants.find((x) => x.id === id);
      if (t && !t.emailVerified) {
        const ok = confirm(
          `⚠️ Peringatan\n\nTenant "${t.name}" BELUM verifikasi email.\n\n` +
            "Sebaiknya minta tenant verifikasi email dulu (cek inbox/spam) sebelum divalidasi, " +
            "supaya akun dipastikan milik orang yang benar.\n\n" +
            "Tetap lanjutkan validasi?",
        );
        if (!ok) return;
      }
    }
    setActionLoading(id);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validated: newValidated }),
    });
    setActionLoading(null);
    if (res.ok) {
      showMsg("ok", newValidated ? "Tenant berhasil divalidasi" : "Validasi tenant dibatalkan");
      fetchTenants();
    } else {
      showMsg("err", "Gagal mengubah validasi");
    }
  };

  const handleStatus = async (id: string, newStatus: "ACTIVE" | "SUSPENDED") => {
    setActionLoading(id);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setActionLoading(null);
    if (res.ok) {
      showMsg("ok", `Status berhasil diubah ke ${newStatus === "ACTIVE" ? "Aktif" : "Suspended"}`);
      fetchTenants();
    } else {
      showMsg("err", "Gagal mengubah status");
    }
  };

  const handleResetQuota = async (id: string, name: string) => {
    if (!confirm(`Reset kuota chat "${name}" ke 0?`)) return;
    setActionLoading(id);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetChatQuota" }),
    });
    setActionLoading(null);
    if (res.ok) {
      showMsg("ok", `Kuota chat ${name} berhasil direset`);
      fetchTenants();
    } else {
      showMsg("err", "Gagal mereset kuota");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus tenant "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setActionLoading(id);
    const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
    setActionLoading(null);
    if (res.ok) {
      showMsg("ok", "Tenant berhasil dihapus");
      fetchTenants();
    } else {
      showMsg("err", "Gagal menghapus tenant");
    }
  };

  const inputClass = "bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tenant</h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{total} tenant terdaftar</p>
        </div>
        {!notifReady && (
          <button
            onClick={enableNotif}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium transition flex items-center gap-1.5"
            title="Aktifkan notifikasi browser supaya dapat alert saat ada user baru daftar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Aktifkan Notifikasi
          </button>
        )}
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Cari nama, email, brand..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className={`${inputClass} flex-1 min-w-48`}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">Semua Status</option>
          <option value="PENDING">Belum Validasi</option>
          <option value="VALIDATED">Sudah Validasi</option>
          <option value="ACTIVE">Aktif</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>
        ) : tenants.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Tidak ada tenant ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide hidden md:table-cell">Brand</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide hidden sm:table-cell">Kuota Hari Ini</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide hidden lg:table-cell">Bergabung</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-gray-400 dark:text-white/30">{t.email}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {t.brand ? (
                        <a href={`//${t.brand}.${APP_DOMAIN}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {t.brand}
                        </a>
                      ) : (
                        <span className="text-gray-300 dark:text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "ACTIVE" ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                          {t.status === "ACTIVE" ? "Aktif" : "Suspended"}
                        </span>
                        {!t.emailVerified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" title="User belum klik link verifikasi email">
                            ⚠ Email Belum Verifikasi
                          </span>
                        )}
                        {!t.validated && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Belum Validasi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${t.chatCount >= t.effectiveLimit ? "text-red-500 dark:text-red-400" : t.chatCount > 0 ? "text-gray-700 dark:text-white/70" : "text-gray-300 dark:text-white/20"}`}
                          title={t.userDailyChatLimit !== null ? `Override khusus: ${t.userDailyChatLimit}` : `Limit global: ${dailyChatLimit}`}>
                          {t.chatCount}/{t.effectiveLimit}
                          {t.userDailyChatLimit !== null && <span className="ml-1 text-[10px] text-blue-500">★</span>}
                        </span>
                        {!isValidator && t.chatCount > 0 && (
                          <button
                            onClick={() => handleResetQuota(t.id, t.name)}
                            disabled={actionLoading === t.id}
                            title="Reset kuota"
                            className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 transition disabled:opacity-50"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 dark:text-white/30 text-xs">
                      {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <a href={`/admin/tenant/${t.id}`} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 transition">
                          Detail
                        </a>
                        {!t.validated ? (
                          <button
                            onClick={() => handleValidate(t.id, true)}
                            disabled={actionLoading === t.id}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition disabled:opacity-50 font-medium"
                          >
                            Validasi
                          </button>
                        ) : (
                          <button
                            onClick={() => handleValidate(t.id, false)}
                            disabled={actionLoading === t.id}
                            title="Batalkan validasi"
                            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/40 transition disabled:opacity-50"
                          >
                            Batal Validasi
                          </button>
                        )}
                        {!isValidator && (
                          <>
                            {t.status === "ACTIVE" ? (
                              <button
                                onClick={() => handleStatus(t.id, "SUSPENDED")}
                                disabled={actionLoading === t.id}
                                className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/10 hover:bg-orange-200 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 transition disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatus(t.id, "ACTIVE")}
                                disabled={actionLoading === t.id}
                                className="text-xs px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-500/10 hover:bg-green-200 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 transition disabled:opacity-50"
                              >
                                Aktifkan
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(t.id, t.name)}
                              disabled={actionLoading === t.id}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 dark:text-white/30">Halaman {page} dari {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-600 dark:text-white/60">
              Sebelumnya
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-600 dark:text-white/60">
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
