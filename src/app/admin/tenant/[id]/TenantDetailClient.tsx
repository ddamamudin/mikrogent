"use client";

import { useEffect, useState } from "react";
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
  validated: boolean;
  maxRouters: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  chatCount: number;
  dailyChatLimit: number;
  userDailyChatLimit: number | null;
  globalDailyChatLimit: number;
  voiceSecondsUsed: number;
  dailyVoiceSeconds: number;
  userDailyVoiceSeconds: number | null;
  globalDailyVoiceSeconds: number;
  voiceCallEnabled: boolean;
};

type MikrotikCred = {
  id: string;
  name: string;
  host: string;
  port: number;
  sshUser: string;
  sshPass: string;
  connected: boolean;
};

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default function TenantDetailClient({ tenant: initial, mikrotikCreds }: { tenant: Tenant; mikrotikCreds: MikrotikCred[] }) {
  const router = useRouter();
  const [tenant, setTenant] = useState(initial);
  const [chatCount, setChatCount] = useState(initial.chatCount);
  const [voiceUsed, setVoiceUsed] = useState(initial.voiceSecondsUsed);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showPassId, setShowPassId] = useState<string | null>(null);
  const [maxRoutersInput, setMaxRoutersInput] = useState<string>(String(initial.maxRouters));

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Sync state lokal dengan props baru habis router.refresh() — RSC kasih
  // initial baru, kita pakai updatedAt sebagai change marker biar gak loop.
  useEffect(() => {
    setTenant(initial);
    setChatCount(initial.chatCount);
    setVoiceUsed(initial.voiceSecondsUsed);
    setMaxRoutersInput(String(initial.maxRouters));
  }, [initial]);

  // Realtime: subscribe admin:tenant + admin:router. Begitu event terkait
  // tenant ini masuk dari aksi admin lain (atau verify router otomatis),
  // refresh data via router.refresh() — RSC akan rebuild server component
  // dan kasih data terbaru tanpa hard reload halaman.
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=admin:tenant&topic=admin:router");
    const refresh = () => router.refresh();
    es.addEventListener("tenant.upserted", (e) => {
      try {
        const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
        if (id === tenant.id) refresh();
      } catch {}
    });
    es.addEventListener("tenant.deleted", (e) => {
      try {
        const { id } = JSON.parse((e as MessageEvent).data) as { id: string };
        if (id === tenant.id) window.location.href = "/admin/tenant";
      } catch {}
    });
    es.addEventListener("router.changed", refresh);
    return () => { es.close(); };
  }, [router, tenant.id]);

  const handleValidate = async (validated: boolean) => {
    if (validated && !tenant.emailVerified) {
      const ok = confirm(
        `⚠️ Peringatan\n\nTenant "${tenant.name}" BELUM verifikasi email.\n\n` +
          "Sebaiknya minta tenant verifikasi email dulu (cek inbox/spam) sebelum divalidasi, " +
          "supaya akun dipastikan milik orang yang benar.\n\n" +
          "Tetap lanjutkan validasi?",
      );
      if (!ok) return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validated }),
    });
    setLoading(false);
    if (res.ok) {
      setTenant((t) => ({ ...t, validated }));
      showMsg("ok", validated ? "Tenant berhasil divalidasi" : "Validasi tenant dibatalkan");
    } else {
      showMsg("err", "Gagal mengubah validasi");
    }
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

  const [limitInput, setLimitInput] = useState<string>(
    initial.userDailyChatLimit !== null ? String(initial.userDailyChatLimit) : ""
  );

  const [voiceLimitInput, setVoiceLimitInput] = useState<string>(
    initial.userDailyVoiceSeconds !== null ? String(initial.userDailyVoiceSeconds) : ""
  );

  const handleResetVoiceQuota = async () => {
    if (!confirm(`Reset kuota voice "${tenant.name}" ke 0 detik?`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetVoiceQuota" }),
    });
    setLoading(false);
    if (res.ok) {
      setVoiceUsed(0);
      showMsg("ok", "Kuota voice berhasil direset ke 0 detik");
    } else {
      showMsg("err", "Gagal mereset kuota voice");
    }
  };

  const handleSaveVoiceLimit = async () => {
    setLoading(true);
    const payload = voiceLimitInput.trim() === "" ? null : parseInt(voiceLimitInput, 10);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyVoiceSeconds: payload }),
    });
    setLoading(false);
    if (res.ok) {
      const newOverride = payload as number | null;
      const newEffective = newOverride ?? tenant.globalDailyVoiceSeconds;
      setTenant((t) => ({ ...t, userDailyVoiceSeconds: newOverride, dailyVoiceSeconds: newEffective }));
      showMsg("ok", payload === null ? "Override voice dihapus, ikut limit global" : `Limit voice diset ke ${payload} detik/hari`);
    } else {
      const data = await res.json().catch(() => null);
      showMsg("err", data?.error || "Gagal menyimpan limit voice");
    }
  };

  const handleSaveMaxRouters = async () => {
    const n = parseInt(maxRoutersInput, 10);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      showMsg("err", "Kuota router harus 1 - 5");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxRouters: n }),
    });
    setLoading(false);
    if (res.ok) {
      setTenant((t) => ({ ...t, maxRouters: n }));
      showMsg("ok", `Kuota router diset ke ${n}`);
    } else {
      const data = await res.json().catch(() => null);
      showMsg("err", data?.error || "Gagal menyimpan kuota router");
    }
  };

  const handleSaveLimit = async () => {
    setLoading(true);
    const payload = limitInput.trim() === "" ? null : parseInt(limitInput, 10);
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyChatLimit: payload }),
    });
    setLoading(false);
    if (res.ok) {
      const newOverride = payload as number | null;
      const newEffective = newOverride ?? tenant.globalDailyChatLimit;
      setTenant((t) => ({ ...t, userDailyChatLimit: newOverride, dailyChatLimit: newEffective }));
      showMsg("ok", payload === null ? "Override dihapus, ikut limit global" : `Limit khusus diset ke ${payload} chat/hari`);
    } else {
      showMsg("err", "Gagal menyimpan limit");
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
    { label: "Brand", value: tenant.brand ? <a href={`//${tenant.brand}.${APP_DOMAIN}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{tenant.brand}.{APP_DOMAIN}</a> : "-" },
    { label: "Alamat", value: tenant.alamat || "-" },
    { label: "No. WhatsApp", value: tenant.noWa || "-" },
    { label: "Email Verified", value: tenant.emailVerified ? "Ya" : "Belum" },
    {
      label: "Validasi Admin",
      value: tenant.validated
        ? <span className="text-green-600 dark:text-green-400 font-medium">Tervalidasi</span>
        : <span className="text-amber-600 dark:text-amber-400 font-medium">Menunggu validasi</span>,
    },
    {
      label: "Kuota Chat Hari Ini",
      value: (
        <span className={`font-medium ${chatCount >= tenant.dailyChatLimit ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
          {chatCount}/{tenant.dailyChatLimit} chat
        </span>
      ),
    },
    ...(tenant.voiceCallEnabled ? [{
      label: "Kuota Voice Hari Ini",
      value: (
        <span className={`font-medium ${voiceUsed >= tenant.dailyVoiceSeconds ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
          {voiceUsed}/{tenant.dailyVoiceSeconds} detik
        </span>
      ),
    }] : []),
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

      {/* Limit Chat Harian */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Limit Chat Harian</h2>
          <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
            Kosongkan untuk pakai limit global ({tenant.globalDailyChatLimit} chat/hari).
            Isi angka untuk override khusus tenant ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            min={0}
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            placeholder={`Default: ${tenant.globalDailyChatLimit}`}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 w-40"
          />
          <span className="text-sm text-gray-400 dark:text-white/40">chat/hari</span>
          <button
            onClick={handleSaveLimit}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-white/40">
          Limit efektif saat ini: <strong className="text-gray-900 dark:text-white">{tenant.dailyChatLimit}</strong>
          {tenant.userDailyChatLimit !== null && " (override)"}
        </p>
      </div>

      {/* Limit Voice Harian */}
      {tenant.voiceCallEnabled && (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Limit Voice Harian</h2>
          <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
            Kosongkan untuk pakai limit global ({tenant.globalDailyVoiceSeconds} detik/hari).
            Isi angka detik (0-3600) untuk override khusus tenant ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            min={0}
            max={3600}
            step={30}
            value={voiceLimitInput}
            onChange={(e) => setVoiceLimitInput(e.target.value)}
            placeholder={`Default: ${tenant.globalDailyVoiceSeconds}`}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 w-40"
          />
          <span className="text-sm text-gray-400 dark:text-white/40">detik/hari</span>
          <button
            onClick={handleSaveVoiceLimit}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-white/40">
          Limit efektif saat ini: <strong className="text-gray-900 dark:text-white">{tenant.dailyVoiceSeconds}</strong> detik
          {tenant.userDailyVoiceSeconds !== null && " (override)"}
        </p>
      </div>
      )}

      {/* Kuota Router */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Kuota Router</h2>
          <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
            Jumlah router yang boleh ditambahkan tenant ini (default 1, maksimal 5). Tenant tidak bisa nambah router sendiri di luar kuota - mereka harus minta admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="number"
            min={1} max={5}
            value={maxRoutersInput}
            onChange={(e) => setMaxRoutersInput(e.target.value)}
            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 w-20"
          />
          <span className="text-sm text-gray-400 dark:text-white/40">router</span>
          <button
            onClick={handleSaveMaxRouters}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-white/40">
          Kuota saat ini: <strong className="text-gray-900 dark:text-white">{tenant.maxRouters}</strong> router (sudah dipakai: {mikrotikCreds.length})
        </p>
      </div>

      {/* Kredensial MikroTik - list semua router tenant */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-50 dark:border-white/5">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Kredensial MikroTik ({mikrotikCreds.length})</h2>
        </div>
        {mikrotikCreds.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400 dark:text-white/30">Belum ada router yang disimpan tenant ini.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {mikrotikCreds.map((cred) => (
              <div key={cred.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{cred.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cred.connected ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-white/30"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cred.connected ? "bg-green-500" : "bg-gray-300 dark:bg-white/20"}`} />
                    {cred.connected ? "Terhubung" : "Belum terhubung"}
                  </span>
                </div>
                <dl className="text-xs space-y-1">
                  <div className="flex gap-3"><dt className="text-gray-400 dark:text-white/40 w-20">Host</dt><dd className="font-mono text-gray-700 dark:text-white/80">{cred.host}:{cred.port}</dd></div>
                  <div className="flex gap-3"><dt className="text-gray-400 dark:text-white/40 w-20">Username</dt><dd className="font-mono text-gray-700 dark:text-white/80">{cred.sshUser}</dd></div>
                  <div className="flex gap-3 items-center">
                    <dt className="text-gray-400 dark:text-white/40 w-20">Password</dt>
                    <dd className="font-mono text-gray-700 dark:text-white/80 flex items-center gap-2">
                      {showPassId === cred.id ? cred.sshPass : "••••••••"}
                      <button onClick={() => setShowPassId(showPassId === cred.id ? null : cred.id)} className="text-blue-500 hover:text-blue-600 transition">
                        {showPassId === cred.id ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aksi */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Aksi</h2>
        <div className="flex flex-wrap gap-3">
          {!tenant.validated ? (
            <button onClick={() => handleValidate(true)} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
              Validasi Tenant
            </button>
          ) : (
            <button onClick={() => handleValidate(false)} disabled={loading} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 text-sm font-medium transition disabled:opacity-50">
              Batal Validasi
            </button>
          )}
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
          {tenant.voiceCallEnabled && (
            <button onClick={handleResetVoiceQuota} disabled={loading || voiceUsed === 0} className="px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 hover:bg-blue-200 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium transition disabled:opacity-50">
              Reset Kuota Voice
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
