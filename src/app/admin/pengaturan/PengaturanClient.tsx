"use client";

import { useState } from "react";

type Config = {
  registrationEnabled: boolean;
  showBrandField: boolean;
  llmProvider: string;
  claudeApiKey: string | null;
  openaiApiKey: string | null;
  anthropicModel: string;
  openaiModel: string;
  openaiRealtimeModel: string;
  openaiVoice: string;
  agentPersona: string | null;
  agentKnowledge: string | null;
  dailyChatLimit: number;
  voiceCallEnabled: boolean;
  voiceDailySeconds: number;
  defaultMaxRouters: number;
};
type Admin = { name: string; email: string };

const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-7", label: "Claude Opus 4.7 (paling pintar, paling mahal)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balance - direkomendasikan)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (cepat & murah)" },
];

const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (balance - direkomendasikan)" },
  { id: "gpt-4.1", label: "GPT-4.1 (paling pintar)" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini (cepat & murah)" },
];

const OPENAI_REALTIME_MODELS = [
  { id: "gpt-realtime", label: "gpt-realtime (production)" },
  { id: "gpt-realtime-2", label: "gpt-realtime-2 (GPT-5-class, 128k ctx)" },
];

const OPENAI_VOICES = [
  { id: "marin", label: "Marin (cewek warm, natural - direkomendasikan)" },
  { id: "coral", label: "Coral (cewek muda, ceria)" },
  { id: "shimmer", label: "Shimmer (cewek bright, announcer)" },
  { id: "sage", label: "Sage (cewek tenang, senior)" },
  { id: "alloy", label: "Alloy (netral)" },
  { id: "echo", label: "Echo (cowok)" },
  { id: "ash", label: "Ash (cowok deep)" },
  { id: "ballad", label: "Ballad (cowok British)" },
  { id: "verse", label: "Verse (cowok ekspresif)" },
  { id: "cedar", label: "Cedar (cowok modern)" },
];

export default function PengaturanClient({ config: initial, admin, isSuper = true }: { config: Config; admin: Admin; isSuper?: boolean }) {
  const [registrationEnabled, setRegistrationEnabled] = useState(initial.registrationEnabled);
  const [showBrand, setShowBrand] = useState(initial.showBrandField);
  const [configLoading, setConfigLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const [llmProvider, setLlmProvider] = useState<"anthropic" | "openai">(
    initial.llmProvider === "anthropic" ? "anthropic" : "openai",
  );
  const [claudeApiKey, setClaudeApiKey] = useState(initial.claudeApiKey ?? "");
  const [openaiApiKey, setOpenaiApiKey] = useState(initial.openaiApiKey ?? "");
  const [anthropicModel, setAnthropicModel] = useState(initial.anthropicModel || "claude-sonnet-4-6");
  const [openaiModel, setOpenaiModel] = useState(initial.openaiModel || "gpt-4o");
  const [openaiRealtimeModel, setOpenaiRealtimeModel] = useState(initial.openaiRealtimeModel || "gpt-realtime");
  const [providerLoading, setProviderLoading] = useState(false);

  const [agentPersona, setAgentPersona] = useState(initial.agentPersona ?? "");
  const [agentKnowledge, setAgentKnowledge] = useState(initial.agentKnowledge ?? "");
  const [dailyChatLimit, setDailyChatLimit] = useState(String(initial.dailyChatLimit));
  const [personaLoading, setPersonaLoading] = useState(false);

  const [voiceCallEnabled, setVoiceCallEnabled] = useState(initial.voiceCallEnabled);
  const [voiceDailySeconds, setVoiceDailySeconds] = useState(String(initial.voiceDailySeconds));
  const [openaiVoice, setOpenaiVoice] = useState(initial.openaiVoice || "coral");
  const [voiceLoading, setVoiceLoading] = useState(false);

  const [defaultMaxRouters, setDefaultMaxRouters] = useState(String(initial.defaultMaxRouters ?? 1));
  const [syncExisting, setSyncExisting] = useState(false);
  const [routerQuotaLoading, setRouterQuotaLoading] = useState(false);

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleToggleRegistration = async (val: boolean) => {
    setConfigLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationEnabled: val }),
    });
    setConfigLoading(false);
    if (res.ok) { setRegistrationEnabled(val); showMsg("ok", `Halaman daftar ${val ? "diaktifkan" : "dinonaktifkan"}`); }
    else showMsg("err", "Gagal menyimpan pengaturan");
  };

  const handleToggleShowBrand = async (val: boolean) => {
    setConfigLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showBrandField: val }),
    });
    setConfigLoading(false);
    if (res.ok) { setShowBrand(val); showMsg("ok", `Field brand ${val ? "ditampilkan" : "disembunyikan"}`); }
    else showMsg("err", "Gagal menyimpan pengaturan");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return showMsg("err", "Password minimal 8 karakter");
    if (newPassword !== confirmPassword) return showMsg("err", "Konfirmasi password tidak cocok");
    setPassLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setPassLoading(false);
    if (res.ok) { showMsg("ok", "Password berhasil diperbarui"); setNewPassword(""); setConfirmPassword(""); }
    else showMsg("err", "Gagal memperbarui password");
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (llmProvider === "anthropic" && !claudeApiKey.trim()) {
      return showMsg("err", "API Key Anthropic wajib diisi");
    }
    if (llmProvider === "openai" && !openaiApiKey.trim()) {
      return showMsg("err", "API Key OpenAI wajib diisi");
    }
    setProviderLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentConfig: {
          llmProvider,
          claudeApiKey: claudeApiKey.trim(),
          openaiApiKey: openaiApiKey.trim(),
          anthropicModel,
          openaiModel,
          openaiRealtimeModel,
        },
      }),
    });
    setProviderLoading(false);
    if (res.ok) showMsg("ok", "Provider AI & model disimpan");
    else showMsg("err", "Gagal menyimpan provider & model");
  };

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseInt(dailyChatLimit);
    if (isNaN(limit) || limit < 1) return showMsg("err", "Batas chat harus angka minimal 1");
    setPersonaLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentConfig: {
          agentPersona: agentPersona.trim(),
          agentKnowledge: agentKnowledge.trim(),
          dailyChatLimit: limit,
        },
      }),
    });
    setPersonaLoading(false);
    if (res.ok) showMsg("ok", "Persona, knowledge & limit chat disimpan");
    else showMsg("err", "Gagal menyimpan");
  };

  const handleSaveRouterQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(defaultMaxRouters, 10);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return showMsg("err", "Default kuota router harus 1 - 5");
    }
    setRouterQuotaLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultMaxRouters: n, syncExisting }),
    });
    setRouterQuotaLoading(false);
    const data = await res.json().catch(() => null);
    if (res.ok) {
      const synced = data?.syncedCount ?? 0;
      showMsg("ok", syncExisting
        ? `Default kuota router = ${n}. ${synced} user existing ikut di-update.`
        : `Default kuota router = ${n}.`);
      setSyncExisting(false);
    } else {
      showMsg("err", data?.error || "Gagal menyimpan default kuota router");
    }
  };

  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const secs = parseInt(voiceDailySeconds);
    if (isNaN(secs) || secs < 30 || secs > 3600) {
      return showMsg("err", "Durasi voice harus 30 - 3600 detik");
    }
    if (voiceCallEnabled && !openaiApiKey.trim()) {
      return showMsg("err", "Isi & simpan API Key OpenAI dulu sebelum mengaktifkan voice call");
    }
    setVoiceLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentConfig: {
          voiceCallEnabled,
          voiceDailySeconds: secs,
          openaiVoice,
        },
      }),
    });
    setVoiceLoading(false);
    if (res.ok) showMsg("ok", "Pengaturan Voice Call disimpan");
    else {
      const data = await res.json().catch(() => null);
      showMsg("err", data?.error || "Gagal menyimpan pengaturan Voice Call");
    }
  };

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-brand-orange";
  const textareaClass = inputClass + " resize-none";
  const cardClass = "bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4 break-inside-avoid mb-6";
  const sectionHead = "text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider";
  const btnPrimary = "w-full py-2 rounded-lg bg-gradient-to-b from-brand-orange to-brand-orange-dark hover:from-brand-orange-dark hover:to-brand-orange-darker text-white text-sm font-medium transition disabled:opacity-50";

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{admin.name} - {admin.email}</p>
      </div>

      {message && (
        <div className={`sticky top-3 z-30 text-sm px-4 py-3 rounded-lg mb-6 shadow-md ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      <div className="columns-1 lg:columns-2 gap-6">

        {/* Sistem - toggles autosave */}
        <div className={cardClass}>
          <h2 className={sectionHead}>Sistem</h2>

          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Halaman daftar tenant</p>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Matikan kalau gak mau ada pendaftaran user baru, admin bikinin manual atau impersonate</p>
            </div>
            <button onClick={() => handleToggleRegistration(!registrationEnabled)} disabled={configLoading}
              className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${registrationEnabled ? "bg-brand-orange" : "bg-gray-200 dark:bg-white/10"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${registrationEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {isSuper && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4">
              <div className="pr-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Field brand saat daftar</p>
                <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Matikan jika aplikasi belum pakai fitur subdomain</p>
              </div>
              <button onClick={() => handleToggleShowBrand(!showBrand)} disabled={configLoading}
                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${showBrand ? "bg-brand-orange" : "bg-gray-200 dark:bg-white/10"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showBrand ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-white/30 italic">Toggle di sini auto-save, gak perlu klik tombol simpan.</p>
        </div>

        {/* Provider AI & Model */}
        <form onSubmit={handleSaveProvider} className={cardClass}>
          <h2 className={sectionHead}>Provider AI & Model</h2>

          <div className="space-y-2">
            <label className="text-sm text-gray-600 dark:text-white/60">Provider LLM (chat)</label>
            <div className="grid grid-cols-2 gap-2">
              {(["openai", "anthropic"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLlmProvider(p)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                    llmProvider === p
                      ? "bg-brand-orange-50 dark:bg-brand-orange/10 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  {p === "openai" ? "OpenAI (GPT)" : "Anthropic (Claude)"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/30">
              Voice call selalu lewat OpenAI Realtime. Pilih chat provider apa aja, voice tetap jalan asal API Key OpenAI di bawah terisi.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-100 dark:border-white/5 p-3 bg-gray-50/50 dark:bg-white/[0.02]">
            <p className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
              OpenAI{llmProvider === "openai" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 normal-case tracking-normal">aktif buat chat</span>}
              {llmProvider !== "openai" && voiceCallEnabled && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 normal-case tracking-normal">dipakai buat voice</span>}
            </p>
            <div className="space-y-1">
              <label className="text-sm text-gray-600 dark:text-white/60">API Key</label>
              <input type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)}
                className={inputClass} placeholder="sk-..." autoComplete="off" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600 dark:text-white/60">Model chat</label>
              <select value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} className={inputClass}>
                {OPENAI_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600 dark:text-white/60">Model voice / realtime</label>
              <select value={openaiRealtimeModel} onChange={(e) => setOpenaiRealtimeModel(e.target.value)} className={inputClass}>
                {OPENAI_REALTIME_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-100 dark:border-white/5 p-3 bg-gray-50/50 dark:bg-white/[0.02]">
            <p className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">
              Anthropic{llmProvider === "anthropic" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 normal-case tracking-normal">aktif buat chat</span>}
            </p>
            <div className="space-y-1">
              <label className="text-sm text-gray-600 dark:text-white/60">API Key</label>
              <input type="password" value={claudeApiKey} onChange={(e) => setClaudeApiKey(e.target.value)}
                className={inputClass} placeholder="sk-ant-api03-..." autoComplete="off" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600 dark:text-white/60">Model</label>
              <select value={anthropicModel} onChange={(e) => setAnthropicModel(e.target.value)} className={inputClass}>
                {ANTHROPIC_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={providerLoading} className={btnPrimary}>
            {providerLoading ? "Menyimpan..." : "Simpan Provider & Model"}
          </button>
        </form>

        {/* Persona & Knowledge */}
        <form onSubmit={handleSavePersona} className={cardClass}>
          <h2 className={sectionHead}>Persona, Knowledge & Limit Chat</h2>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Persona Agent</label>
            <textarea value={agentPersona} onChange={(e) => setAgentPersona(e.target.value)}
              rows={5} className={textareaClass}
              placeholder="Contoh: Kamu adalah asisten jaringan profesional yang membantu reseller ISP mengelola MikroTik..." />
            <p className="text-xs text-gray-400 dark:text-white/30">Karakter & gaya agent (dipakai di chat & voice)</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Knowledge Base</label>
            <textarea value={agentKnowledge} onChange={(e) => setAgentKnowledge(e.target.value)}
              rows={5} className={textareaClass}
              placeholder="Contoh: Semua user adalah reseller ISP dengan jaringan FTTH. Router biasanya RB series RouterOS 6.x/7.x..." />
            <p className="text-xs text-gray-400 dark:text-white/30">Konteks bisnis & pengetahuan khusus</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Batas chat per hari (per user)</label>
            <input type="number" min={1} max={9999} value={dailyChatLimit} onChange={(e) => setDailyChatLimit(e.target.value)}
              className={inputClass} placeholder="50" />
          </div>

          <button type="submit" disabled={personaLoading} className={btnPrimary}>
            {personaLoading ? "Menyimpan..." : "Simpan Persona & Limit"}
          </button>
        </form>

        {/* Default Kuota Router */}
        <form onSubmit={handleSaveRouterQuota} className={cardClass}>
          <h2 className={sectionHead}>Default Kuota Router</h2>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Jumlah router default per user baru</label>
            <input type="number" min={1} max={5}
              value={defaultMaxRouters} onChange={(e) => setDefaultMaxRouters(e.target.value)}
              className={inputClass} placeholder="1" />
            <p className="text-xs text-gray-400 dark:text-white/30">
              Berlaku untuk user yang daftar setelah disimpan. Range 1 - 5. Untuk fase internal sekarang isi <strong>5</strong>; untuk public/eksternal isi <strong>1</strong>.
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={syncExisting} onChange={(e) => setSyncExisting(e.target.checked)} className="mt-0.5 accent-blue-600" />
            <span className="text-sm text-gray-600 dark:text-white/60">
              Sync ke user existing
              <span className="block text-xs text-gray-400 dark:text-white/30 mt-0.5">
                Naikkin <code className="bg-gray-100 dark:bg-white/5 px-1 rounded">maxRouters</code> semua user yang sekarang di bawah nilai default ini. User yang sudah di atas tidak diturunin.
              </span>
            </span>
          </label>

          <button type="submit" disabled={routerQuotaLoading} className={btnPrimary}>
            {routerQuotaLoading ? "Menyimpan..." : "Simpan Default Kuota Router"}
          </button>
        </form>

        {/* Voice Conversation */}
        <form onSubmit={handleSaveVoice} className={cardClass}>
          <h2 className={sectionHead}>Voice Conversation</h2>

          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Aktifkan Voice Call Realtime</p>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Tombol kirim user berubah jadi telepon saat input kosong. Butuh provider OpenAI + API key.</p>
            </div>
            <button
              type="button"
              onClick={() => setVoiceCallEnabled((v) => !v)}
              className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceCallEnabled ? "bg-brand-orange" : "bg-gray-200 dark:bg-white/10"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceCallEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {voiceCallEnabled && !openaiApiKey.trim() && (
            <div className="text-xs px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
              Voice call butuh <strong>API Key OpenAI</strong> terisi di card Provider AI. Chat provider boleh tetap Claude/lainnya, voice cuma jalan lewat OpenAI Realtime.
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Suara Agent</label>
            <select value={openaiVoice} onChange={(e) => setOpenaiVoice(e.target.value)} className={inputClass}>
              {OPENAI_VOICES.map((v) => (<option key={v.id} value={v.id}>{v.label}</option>))}
            </select>
            <p className="text-xs text-gray-400 dark:text-white/30">Coba beberapa pilihan & putuskan mana yg paling cocok dengan persona</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Batas durasi voice per hari (detik, per user)</label>
            <input type="number" min={30} max={3600} step={30}
              value={voiceDailySeconds} onChange={(e) => setVoiceDailySeconds(e.target.value)}
              className={inputClass} placeholder="180" />
            <p className="text-xs text-gray-400 dark:text-white/30">Default 180 detik (3 menit). Voice mahal - set hati-hati.</p>
          </div>

          <button type="submit" disabled={voiceLoading} className={btnPrimary}>
            {voiceLoading ? "Menyimpan..." : "Simpan Pengaturan Voice"}
          </button>
        </form>

        {/* Ganti Password */}
        <form onSubmit={handleUpdatePassword} className={cardClass}>
          <h2 className={sectionHead}>Akun Admin - Ganti Password</h2>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Password Baru</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              required className={inputClass} placeholder="Min. 8 karakter" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required className={inputClass} />
          </div>
          <button type="submit" disabled={passLoading} className={btnPrimary}>
            {passLoading ? "Menyimpan..." : "Perbarui Password"}
          </button>
        </form>

      </div>
    </div>
  );
}
