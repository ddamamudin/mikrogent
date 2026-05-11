"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = {
  id: string;
  name: string;
  email: string;
  brand: string | null;
  alamat: string | null;
  noWa: string | null;
  status: "ACTIVE" | "SUSPENDED";
  emailVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  chatCount: number;
  dailyChatLimit: number;
};

type MikrotikCred = {
  host: string;
  port: number;
  sshUser: string;
  sshPass: string;
  connected: boolean;
} | null;

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default function TenantDetailClient({ tenant: initial, mikrotikCred }: { tenant: Tenant; mikrotikCred: MikrotikCred }) {
  const router = useRouter();
  const [tenant, setTenant] = useState(initial);
  const [chatCount, setChatCount] = useState(initial.chatCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showPass, setShowPass] = useState(false);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStatus = async (status: "ACTIVE" | "SUSPENDED") => {
    setLoading(true);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    if (res.ok) {
      setTenant((t) => ({ ...t, status }));
      showMsg("ok", `Status diubah ke ${status === "ACTIVE" ? "Aktif" : "Suspended"}`);
    } else {
      showMsg("err", "Gagal mengubah status");
    }
  };

  const handleResetQuota = async () => {
    if (!confirm(`Reset kuota chat "${tenant.name}" ke 0?`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetChatQuota" }),
    });
    setLoading(false);
    if (res.ok) {
      setChatCount(0);
      showMsg("ok", "Kuota chat berhasil direset ke 0");
    } else {
      showMsg("err", "Gagal mereset kuota");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus tenant "${tenant.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/tenant");
    } else {
      showMsg("err", "Gagal menghapus tenant");
    }
  };

  const rows = [
    { label: "Email", value: tenant.email },
    { label: "Brand", value: tenant.brand ? <a href={`//${tenant.brand}.${APP_DOMAIN}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{tenant.brand}.{APP_DOMAIN}</a> : "—" },
    { label: "Alamat", value: tenant.alamat || "—" },
    { label: "No. WhatsApp", value: tenant.noWa || "—" },
    { label: "Email Verified", value: tenant.emailVerified ? "Ya" : "Belum" },
    {
      label: "Kuota Chat Hari Ini",
      value: (
        <span className={`font-medium ${chatCount >= tenant.dailyChatLimit ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
          {chatCount}/{tenant.dailyChatLimit} chat
        </span>
      ),
    },
    { label: "Bergabung", value: new Date(tenant.createdAt).toLocaleString("id-ID") },
    { label: "Terakhir Update", value: new Date(tenant.updatedAt).toLocaleString("id-ID") },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <a href="/admin/tenant" className="text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition">
          ← Kembali
        </a>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{tenant.name}</h1>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${tenant.status === "ACTIVE" ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {tenant.status === "ACTIVE" ? "Aktif" : "Suspended"}
          </span>
        </div>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {/* Info umum */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <dl className="divide-y divide-gray-50 dark:divide-white/5">
          {rows.map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-start gap-4">
              <dt className="text-sm text-gray-400 dark:text-white/40 w-36 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Kredensial MikroTik */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Kredensial MikroTik</h2>
          {mikrotikCred && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${mikrotikCred.connected ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-white/30"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${mikrotikCred.connected ? "bg-green-500" : "bg-gray-300 dark:bg-white/20"}`} />
              {mikrotikCred.connected ? "Terhubung" : "Belum terhubung"}
            </span>
          )}
        </div>
        {mikrotikCred ? (
          <dl className="divide-y divide-gray-50 dark:divide-white/5">
            <div className="px-5 py-3 flex items-center gap-4">
              <dt className="text-sm text-gray-400 dark:text-white/40 w-36 shrink-0">Host</dt>
              <dd className="text-sm text-gray-900 dark:text-white font-mono">{mikrotikCred.host}</dd>
            </div>
            <div className="px-5 py-3 flex items-center gap-4">
              <dt className="text-sm text-gray-400 dark:text-white/40 w-36 shrink-0">Port</dt>
              <dd className="text-sm text-gray-900 dark:text-white font-mono">{mikrotikCred.port}</dd>
            </div>
            <div className="px-5 py-3 flex items-center gap-4">
              <dt className="text-sm text-gray-400 dark:text-white/40 w-36 shrink-0">Username</dt>
              <dd className="text-sm text-gray-900 dark:text-white font-mono">{mikrotikCred.sshUser}</dd>
            </div>
            <div className="px-5 py-3 flex items-center gap-4">
              <dt className="text-sm text-gray-400 dark:text-white/40 w-36 shrink-0">Password</dt>
              <dd className="text-sm text-gray-900 dark:text-white font-mono flex items-center gap-2">
                {showPass ? mikrotikCred.sshPass : "••••••••"}
                <button
                  onClick={() => setShowPass((v) => !v)}
                  className="text-xs text-blue-500 hover:text-blue-600 transition"
                >
                  {showPass ? "Sembunyikan" : "Tampilkan"}
                </button>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400 dark:text-white/30">Belum ada kredensial MikroTik yang disimpan.</p>
        )}
      </div>

      {/* Aksi */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Aksi</h2>
        <div className="flex flex-wrap gap-3">
          {tenant.status === "ACTIVE" ? (
            <button onClick={() => handleStatus("SUSPENDED")} disabled={loading} className="px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-500/10 hover:bg-orange-200 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-medium transition disabled:opacity-50">
              Suspend Tenant
            </button>
          ) : (
            <button onClick={() => handleStatus("ACTIVE")} disabled={loading} className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-500/10 hover:bg-green-200 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium transition disabled:opacity-50">
              Aktifkan Tenant
            </button>
          )}
          <button onClick={handleResetQuota} disabled={loading || chatCount === 0} className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium transition disabled:opacity-50">
            Reset Kuota Chat
          </button>
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium transition disabled:opacity-50">
            Hapus Tenant
          </button>
        </div>
      </div>
    </div>
  );
}
