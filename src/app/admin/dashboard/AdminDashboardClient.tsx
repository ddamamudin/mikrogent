"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stats = {
  total: number;
  active: number;
  suspended: number;
  pending: number;
  newThisMonth: number;
  chatToday: number;
  voiceTodaySeconds: number;
  routerTotal: number;
  routerConnected: number;
  feedbackOpen: number;
};

type RecentTenant = {
  id: string;
  name: string;
  email: string;
  brand: string | null;
  validated: boolean;
  emailVerified: boolean;
  status: string;
  createdAt: string;
};

type RecentLog = {
  id: string;
  adminName: string;
  action: string;
  details: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: "Masuk",
  validate_tenant: "Validasi tenant",
  unvalidate_tenant: "Batal validasi",
  activate_tenant: "Aktifkan tenant",
  suspend_tenant: "Suspend tenant",
  delete_tenant: "Hapus tenant",
  reset_chat_quota: "Reset kuota chat",
  reset_voice_quota: "Reset kuota voice",
  set_chat_limit: "Set limit chat",
  set_voice_limit: "Set limit voice",
  set_max_routers: "Set kuota router",
  set_default_max_routers: "Set default kuota router",
  set_registration_enabled: "Toggle pendaftaran",
  set_show_brand_field: "Toggle field brand",
  set_admin_setup_enabled: "Toggle admin setup",
  update_agent_config: "Update config agent",
  change_password: "Ganti password",
  router_create: "Buat router",
  router_update: "Update router",
  router_delete: "Hapus router",
  router_verify: "Verifikasi router",
  impersonate_start: "Mulai impersonate",
  impersonate_end: "Akhiri impersonate",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} jam`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} hari`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function formatVoice(sec: number): string {
  if (sec < 60) return `${sec}d`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}d`;
}

export default function AdminDashboardClient({
  stats: initialStats,
  recentTenants: initialTenants,
  recentLogs,
}: {
  stats: Stats;
  recentTenants: RecentTenant[];
  recentLogs: RecentLog[];
}) {
  const router = useRouter();
  const [validating, setValidating] = useState<string | null>(null);
  const [tenants, setTenants] = useState<RecentTenant[]>(initialTenants);
  const [stats, setStats] = useState<Stats>(initialStats);

  useEffect(() => {
    setTenants(initialTenants);
    setStats(initialStats);
  }, [initialTenants, initialStats]);

  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=admin:tenant");
    const refresh = () => router.refresh();
    es.addEventListener("tenant.upserted", refresh);
    es.addEventListener("tenant.deleted", refresh);
    return () => {
      es.close();
    };
  }, [router]);

  const handleValidate = async (id: string) => {
    setValidating(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validated: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Gagal validasi");
      } else {
        // Optimistic local update
        setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, validated: true } : t)));
        setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }));
        router.refresh();
      }
    } catch {
      alert("Gagal validasi");
    } finally {
      setValidating(null);
    }
  };

  const cards = [
    {
      label: "Total Tenant",
      value: stats.total,
      sub: `${stats.newThisMonth} baru bulan ini`,
      tone: "blue",
    },
    {
      label: "Aktif",
      value: stats.active,
      sub: `${stats.suspended} disuspend`,
      tone: "green",
    },
    {
      label: "Pending Validasi",
      value: stats.pending,
      sub: stats.pending > 0 ? "perlu di-approve" : "semua sudah divalidasi",
      tone: "amber",
      highlight: stats.pending > 0,
    },
    {
      label: "Chat Hari Ini",
      value: stats.chatToday,
      sub: stats.voiceTodaySeconds > 0 ? `voice ${formatVoice(stats.voiceTodaySeconds)}` : "voice belum dipakai",
      tone: "purple",
    },
    {
      label: "Router Terhubung",
      value: stats.routerConnected,
      sub: `dari ${stats.routerTotal} total`,
      tone: "cyan",
    },
    {
      label: "Feedback Terbuka",
      value: stats.feedbackOpen,
      sub: stats.feedbackOpen > 0 ? "belum dibalas" : "kosong",
      tone: "pink",
      highlight: stats.feedbackOpen > 0,
    },
  ];

  const toneClasses: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/40" },
    green: { bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-600 dark:text-green-400", ring: "ring-green-500/40" },
    amber: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/40" },
    purple: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/40" },
    cyan: { bg: "bg-cyan-50 dark:bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-500/40" },
    pink: { bg: "bg-pink-50 dark:bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", ring: "ring-pink-500/40" },
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Pending validation banner */}
      {stats.pending > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {stats.pending} tenant nunggu divalidasi
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                User udah daftar tapi belum bisa pakai agent. Cek dan validasi mereka.
              </p>
            </div>
          </div>
          <a
            href="/admin/tenant"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition shrink-0"
          >
            Lihat daftar
          </a>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card) => {
          const t = toneClasses[card.tone];
          return (
            <div
              key={card.label}
              className={`${t.bg} rounded-xl p-4 ${card.highlight ? `ring-2 ${t.ring}` : ""}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/50">
                {card.label}
              </p>
              <p className={`text-2xl sm:text-3xl font-bold mt-1.5 ${t.text}`}>{card.value}</p>
              <p className="text-[11px] text-gray-500 dark:text-white/40 mt-1 truncate" title={card.sub}>
                {card.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent tenants + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent tenants */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80">Tenant Terbaru</h2>
            <a href="/admin/tenant" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Semua →
            </a>
          </div>
          {tenants.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">
              Belum ada tenant terdaftar.
            </p>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {tenants.map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`/admin/tenant/${t.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition"
                      >
                        {t.name}
                      </a>
                      {!t.emailVerified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 font-medium uppercase tracking-wider">
                          email belum verif
                        </span>
                      )}
                      {t.status === "SUSPENDED" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">
                          suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-white/40 truncate mt-0.5">
                      {t.email}
                      {t.brand && <span className="ml-1.5">· {t.brand}</span>}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-white/30 hidden sm:inline shrink-0">
                    {relativeTime(t.createdAt)}
                  </span>
                  {!t.validated ? (
                    <button
                      onClick={() => handleValidate(t.id)}
                      disabled={validating === t.id || !t.emailVerified}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      title={!t.emailVerified ? "Tenant belum verifikasi email" : "Validasi tenant"}
                    >
                      {validating === t.id ? "..." : "Validasi"}
                    </button>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-medium shrink-0">
                      Tervalidasi
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-white/80">Aktivitas Terakhir</h2>
            <a href="/admin/log" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Semua →
            </a>
          </div>
          {recentLogs.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 dark:text-white/30 text-center">
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-white/5">
              {recentLogs.map((l) => (
                <li key={l.id} className="px-5 py-2.5">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {ACTION_LABELS[l.action] ?? l.action}
                  </p>
                  {l.details && (
                    <p className="text-[11px] text-gray-500 dark:text-white/40 truncate mt-0.5" title={l.details}>
                      {l.details}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">
                    {l.adminName} · {relativeTime(l.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
