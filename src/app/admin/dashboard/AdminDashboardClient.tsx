"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Stats = { total: number; active: number; suspended: number; newThisMonth: number };

export default function AdminDashboardClient({ stats }: { stats: Stats }) {
  const router = useRouter();

  // Realtime: subscribe admin:tenant. Saat tenant dibuat/diupdate/dihapus,
  // refresh RSC supaya angka di kartu (Total, Aktif, Disuspend, Baru Bulan Ini)
  // auto-update.
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=admin:tenant");
    const refresh = () => router.refresh();
    es.addEventListener("tenant.upserted", refresh);
    es.addEventListener("tenant.deleted", refresh);
    return () => { es.close(); };
  }, [router]);

  const cards = [
    { label: "Total Tenant", value: stats.total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Aktif", value: stats.active, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10" },
    { label: "Disuspend", value: stats.suspended, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
    { label: "Baru Bulan Ini", value: stats.newThisMonth, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">Ringkasan statistik tenant</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-5 border border-transparent`}>
            <p className="text-xs text-gray-500 dark:text-white/50 font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider mb-4">Aksi Cepat</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/tenant" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
            Kelola Tenant
          </a>
          <a href="/admin/pengaturan" className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white/70 text-sm font-medium transition">
            Pengaturan
          </a>
        </div>
      </div>
    </div>
  );
}
