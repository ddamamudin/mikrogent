"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { User } from "@/generated/prisma/client";
import PasswordInput from "@/components/PasswordInput";

const inputClass =
  "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-brand-orange";

type TabId = "profil" | "password" | "hapus";

const TABS: { id: TabId; label: string; danger?: boolean }[] = [
  { id: "profil", label: "Profil" },
  { id: "password", label: "Password" },
  { id: "hapus", label: "Hapus Akun", danger: true },
];

function Toast({ message }: { message: { type: "ok" | "err"; text: string } | null }) {
  if (!message) return null;
  return (
    <div
      className={`text-sm px-4 py-3 rounded-lg ${
        message.type === "ok"
          ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"
          : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"
      }`}
    >
      {message.text}
    </div>
  );
}

type Quota = {
  chatCount: number;
  dailyChatLimit: number;
  voiceSecondsUsed: number;
  voiceDailyLimitSeconds: number;
  voiceCallEnabled: boolean;
};

function QuotaCard({ quota }: { quota: Quota }) {
  const chatPct = Math.min(100, Math.round((quota.chatCount / quota.dailyChatLimit) * 100));
  const voicePct = quota.voiceDailyLimitSeconds > 0
    ? Math.min(100, Math.round((quota.voiceSecondsUsed / quota.voiceDailyLimitSeconds) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 space-y-4 shadow-sm">
      <h2 className="text-xs font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Kuota Hari Ini</h2>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600 dark:text-white/60">Chat</span>
          <span className="text-sm tabular-nums text-gray-900 dark:text-white">
            <strong>{quota.chatCount}</strong>
            <span className="text-gray-400 dark:text-white/30"> / {quota.dailyChatLimit}</span>
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${chatPct >= 100 ? "bg-red-500" : chatPct >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
            style={{ width: `${chatPct}%` }}
          />
        </div>
      </div>

      {quota.voiceCallEnabled && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-600 dark:text-white/60">Voice</span>
            <span className="text-sm tabular-nums text-gray-900 dark:text-white">
              <strong>{quota.voiceSecondsUsed}</strong>
              <span className="text-gray-400 dark:text-white/30"> / {quota.voiceDailyLimitSeconds} detik</span>
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${voicePct >= 100 ? "bg-red-500" : voicePct >= 80 ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${voicePct}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-400 dark:text-white/30">
        Reset otomatis tiap jam 07:00 WIB.
      </p>
    </div>
  );
}

function ProfilTab({ user: initialUser, quota }: { user: User; quota: Quota }) {
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(user.name);
  const [alamat, setAlamat] = useState(user.alamat || "");
  const [noWa, setNoWa] = useState(user.noWa || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showMsg("err", "Nama tidak boleh kosong");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, alamat, noWa }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setUser((u) => ({ ...u, name, alamat, noWa }));
      showMsg("ok", "Profil berhasil diperbarui");
    } else {
      showMsg("err", data.error || "Gagal memperbarui profil");
    }
  };

  return (
    <div className="space-y-4">
      <QuotaCard quota={quota} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Toast message={message} />
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Nama Lengkap</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Email</label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 dark:text-white/30 cursor-not-allowed"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Alamat</label>
            <input type="text" value={alamat} onChange={(e) => setAlamat(e.target.value)} className={inputClass} placeholder="Jl. Merdeka No. 1, Jakarta" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Nomor WhatsApp</label>
            <input type="tel" value={noWa} onChange={(e) => setNoWa(e.target.value)} className={inputClass} placeholder="08xxxxxxxxxx" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return showMsg("err", "Semua field wajib diisi");
    if (newPassword !== confirmPassword) return showMsg("err", "Password baru tidak cocok");
    if (newPassword.length < 8) return showMsg("err", "Password minimal 8 karakter");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      showMsg("ok", "Password berhasil diperbarui");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } else {
      showMsg("err", data.error || "Gagal memperbarui password");
    }
  };

  const fields: { label: string; value: string; set: (v: string) => void; autoComplete: string }[] = [
    { label: "Password Lama", value: currentPassword, set: setCurrentPassword, autoComplete: "current-password" },
    { label: "Password Baru", value: newPassword, set: setNewPassword, autoComplete: "new-password" },
    { label: "Konfirmasi Password Baru", value: confirmPassword, set: setConfirmPassword, autoComplete: "new-password" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Toast message={message} />
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
        {fields.map(({ label, value, set, autoComplete }) => (
          <div key={label} className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">{label}</label>
            <PasswordInput value={value} onChange={(e) => set(e.target.value)} className={inputClass} autoComplete={autoComplete} />
          </div>
        ))}
        <p className="text-xs text-gray-400 dark:text-white/30">Minimal 8 karakter.</p>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Perbarui Password"}
        </button>
      </div>
    </form>
  );
}

const CONFIRM_PHRASE = "HAPUS AKUN";

function HapusTab({ email }: { email: string }) {
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phraseMatched = confirmPhrase.trim().toUpperCase() === CONFIRM_PHRASE;
  const canSubmit = phraseMatched && deleteEmail.trim() && deletePassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseMatched) {
      setError(`Ketik "${CONFIRM_PHRASE}" persis di kolom konfirmasi.`);
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: deleteEmail, password: deletePassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Gagal menghapus akun");
    window.location.href = "/";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-500/20 p-6 space-y-4 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-white/40">
          Tindakan ini permanen dan tidak dapat dibatalkan. Seluruh data akun, kredensial router, riwayat chat, dan kuota akan dihapus dari sistem.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Email</label>
          <input type="email" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} required placeholder={email} className={inputClass} autoComplete="off" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Password</label>
          <PasswordInput value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} required className={inputClass} autoComplete="current-password" />
        </div>

        <div className="space-y-1 pt-2 border-t border-red-100 dark:border-red-500/10">
          <label className="text-sm text-gray-600 dark:text-white/60">
            Ketik <strong className="font-mono text-red-600 dark:text-red-400">{CONFIRM_PHRASE}</strong> untuk konfirmasi
          </label>
          <input
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className={`${inputClass} font-mono ${phraseMatched ? "border-red-400 dark:border-red-500/50" : ""}`}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-gray-400 dark:text-white/30 pt-1">
            Friksi tambahan biar gak kepencet gak sengaja. Wajib persis (huruf kapital).
          </p>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Menghapus..." : phraseMatched ? "Hapus Akun Saya Sekarang" : "Tulis konfirmasi dulu"}
        </button>
      </div>
    </form>
  );
}

export default function ProfilTabsClient({ user, quota }: { user: User; quota: Quota }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTab = useMemo<TabId>(() => {
    const raw = searchParams.get("tab");
    if (raw === "password" || raw === "hapus") return raw;
    return "profil";
  }, [searchParams]);

  const [tab, setTab] = useState<TabId>(initialTab);

  const switchTab = (next: TabId) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "profil") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Pengaturan akun"
        className="flex gap-1 bg-gray-100 dark:bg-slate-800/50 p-1 rounded-lg overflow-x-auto"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const base = "flex-1 min-w-fit px-3 py-1.5 text-sm font-medium rounded-md transition whitespace-nowrap";
          const cls = active
            ? t.danger
              ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm"
              : "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
            : t.danger
              ? "text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-400"
              : "text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white";
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              aria-controls={`tab-panel-${t.id}`}
              onClick={() => switchTab(t.id)}
              className={`${base} ${cls}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id={`tab-panel-${tab}`} role="tabpanel">
        {tab === "profil" && <ProfilTab user={user} quota={quota} />}
        {tab === "password" && <PasswordTab />}
        {tab === "hapus" && <HapusTab email={user.email} />}
      </div>
    </div>
  );
}
