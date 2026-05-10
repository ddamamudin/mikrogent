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
};

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default function TenantDetailClient({ tenant: initial }: { tenant: Tenant }) {
  const router = useRouter();
  const [tenant, setTenant] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium transition disabled:opacity-50">
            Hapus Tenant
          </button>
        </div>
      </div>
    </div>
  );
}
