"use client";

import { useEffect, useState, useCallback } from "react";

type Log = {
  id: string;
  adminName: string;
  action: string;
  details: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  change_password: "Ganti Password",
  validate_tenant: "Validasi Tenant",
  unvalidate_tenant: "Batal Validasi Tenant",
  activate_tenant: "Aktifkan Tenant",
  suspend_tenant: "Suspend Tenant",
  delete_tenant: "Hapus Tenant",
  reset_chat_quota: "Reset Kuota Chat",
  set_chat_limit: "Set Limit Chat",
  update_agent_config: "Update Konfigurasi Agent",
  set_admin_setup_enabled: "Toggle Admin Setup",
  set_show_brand_field: "Toggle Field Brand",
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  change_password: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
  validate_tenant: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
  unvalidate_tenant: "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60",
  activate_tenant: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
  suspend_tenant: "bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
  delete_tenant: "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400",
  reset_chat_quota: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  set_chat_limit: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
  update_agent_config: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const labelOf = (action: string) => ACTION_LABELS[action] ?? action;
const colorOf = (action: string) => ACTION_COLORS[action] ?? "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60";

export default function LogClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), action });
    const res = await fetch(`/api/admin/log?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setAvailableActions(data.availableActions ?? []);
    setLoading(false);
  }, [page, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const inputClass = "bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Log Aktivitas Admin</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{total} aktivitas tercatat</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">Semua Aktivitas</option>
          {availableActions.map((a) => (
            <option key={a} value={a}>{labelOf(a)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Memuat...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-white/30">Belum ada aktivitas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Waktu</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Aktivitas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wide">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition">
                    <td className="px-4 py-3 text-gray-500 dark:text-white/50 whitespace-nowrap text-xs">
                      {new Date(l.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {l.adminName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorOf(l.action)}`}>
                        {labelOf(l.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-white/60 text-xs">
                      {l.details ?? "—"}
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
