"use client";

import { useState } from "react";

type Config = {
  adminSetupEnabled: boolean;
  showBrandField: boolean;
  llmProvider: string;
  claudeApiKey: string | null;
  openaiApiKey: string | null;
  anthropicModel: string;
  openaiModel: string;
  openaiRealtimeModel: string;
  agentPersona: string | null;
  agentKnowledge: string | null;
  dailyChatLimit: number;
  voiceCallEnabled: boolean;
  voiceDailySeconds: number;
};
type Admin = { name: string; email: string };

const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-7", label: "Claude Opus 4.7 (paling pintar, paling mahal)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balance — direkomendasikan)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (cepat & murah)" },
];

const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (balance — direkomendasikan)" },
  { id: "gpt-4.1", label: "GPT-4.1 (paling pintar)" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini (cepat & murah)" },
];

const OPENAI_REALTIME_MODELS = [
  { id: "gpt-realtime", label: "gpt-realtime (production)" },
  { id: "gpt-realtime-2", label: "gpt-realtime-2 (GPT-5-class, 128k ctx)" },
];

export default function PengaturanClient({ config: initial, admin }: { config: Config; admin: Admin }) {
  const [setupEnabled, setSetupEnabled] = useState(initial.adminSetupEnabled);
  const [showBrand, setShowBrand] = useState(initial.showBrandField);
  const [configLoading, setConfigLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const [llmProvider, setLlmProvider] = useState<"anthropic" | "openai">(
    initial.llmProvider === "openai" ? "openai" : "anthropic",
  );
  const [claudeApiKey, setClaudeApiKey] = useState(initial.claudeApiKey ?? "");
  const [openaiApiKey, setOpenaiApiKey] = useState(initial.openaiApiKey ?? "");
  const [anthropicModel, setAnthropicModel] = useState(initial.anthropicModel || "claude-sonnet-4-6");
  const [openaiModel, setOpenaiModel] = useState(initial.openaiModel || "gpt-4o");
  const [openaiRealtimeModel, setOpenaiRealtimeModel] = useState(initial.openaiRealtimeModel || "gpt-realtime");
  const [agentPersona, setAgentPersona] = useState(initial.agentPersona ?? "");
  const [agentKnowledge, setAgentKnowledge] = useState(initial.agentKnowledge ?? "");
  const [dailyChatLimit, setDailyChatLimit] = useState(String(initial.dailyChatLimit));
  const [agentLoading, setAgentLoading] = useState(false);

  const [voiceCallEnabled, setVoiceCallEnabled] = useState(initial.voiceCallEnabled);
  const [voiceDailySeconds, setVoiceDailySeconds] = useState(String(initial.voiceDailySeconds));
  const [voiceLoading, setVoiceLoading] = useState(false);

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleToggleSetup = async (val: boolean) => {
    setConfigLoading(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminSetupEnabled: val }),
    });
    setConfigLoading(false);
    if (res.ok) { setSetupEnabled(val); showMsg("ok", `Halaman setup admin ${val ? "diaktifkan" : "dinonaktifkan"}`); }
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

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseInt(dailyChatLimit);
    if (isNaN(limit) || limit < 1) return showMsg("err", "Batas chat harus angka minimal 1");
    if (llmProvider === "anthropic" && !claudeApiKey.trim()) {
      return showMsg("err", "API Key Anthropic wajib diisi karena provider aktif adalah Anthropic");
    }
    if (llmProvider === "openai" && !openaiApiKey.trim()) {
      return showMsg("err", "API Key OpenAI wajib diisi karena provider aktif adalah OpenAI");
    }
    setAgentLoading(true);
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
          agentPersona: agentPersona.trim(),
          agentKnowledge: agentKnowledge.trim(),
          dailyChatLimit: limit,
        },
      }),
    });
    setAgentLoading(false);
    if (res.ok) showMsg("ok", "Pengaturan AI Agent disimpan");
    else showMsg("err", "Gagal menyimpan pengaturan AI Agent");
  };

  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const secs = parseInt(voiceDailySeconds);
    if (isNaN(secs) || secs < 30 || secs > 3600) {
      return showMsg("err", "Durasi voice harus 30 - 3600 detik");
    }
    if (voiceCallEnabled && llmProvider !== "openai") {
      return showMsg("err", "Voice call hanya bisa diaktifkan saat provider = OpenAI");
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

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";
  const textareaClass = inputClass + " resize-none";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Pengaturan</h1>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{admin.name} — {admin.email}</p>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {/* Setup Admin Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Halaman Setup Admin</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Aktifkan /admin/setup</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Matikan setelah semua admin dibuat</p>
          </div>
          <button onClick={() => handleToggleSetup(!setupEnabled)} disabled={configLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${setupEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${setupEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-white/30">
          Status: <span className={setupEnabled ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}>{setupEnabled ? "Aktif" : "Nonaktif"}</span>
          {" — "}URL: <code className="text-xs">/admin/setup</code>
        </p>
      </div>

      {/* Field Brand */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Fitur Brand / Subdomain</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Tampilkan field brand saat daftar</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Matikan jika aplikasi belum menggunakan fitur subdomain</p>
          </div>
          <button onClick={() => handleToggleShowBrand(!showBrand)} disabled={configLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${showBrand ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showBrand ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-white/30">
          Status: <span className={showBrand ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>{showBrand ? "Ditampilkan" : "Disembunyikan (brand di-generate otomatis dari email)"}</span>
        </p>
      </div>

      {/* AI Agent Settings */}
      <form onSubmit={handleSaveAgent} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Pengaturan AI Agent</h2>

        <div className="space-y-2">
          <label className="text-sm text-gray-600 dark:text-white/60">Provider LLM</label>
          <div className="grid grid-cols-2 gap-2">
            {(["anthropic", "openai"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setLlmProvider(p)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                  llmProvider === p
                    ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400"
                    : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                {p === "anthropic" ? "Anthropic (Claude)" : "OpenAI (GPT)"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-white/30">Provider yang dipakai semua user untuk chat dengan Replay Agent</p>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-100 dark:border-white/5 p-3 bg-gray-50/50 dark:bg-white/[0.02]">
          <p className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">Anthropic{llmProvider === "anthropic" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 normal-case tracking-normal">aktif</span>}</p>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">API Key</label>
            <input
              type="password" value={claudeApiKey} onChange={(e) => setClaudeApiKey(e.target.value)}
              className={inputClass} placeholder="sk-ant-api03-..." autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Model</label>
            <select value={anthropicModel} onChange={(e) => setAnthropicModel(e.target.value)} className={inputClass}>
              {ANTHROPIC_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-100 dark:border-white/5 p-3 bg-gray-50/50 dark:bg-white/[0.02]">
          <p className="text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wider">OpenAI{llmProvider === "openai" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 normal-case tracking-normal">aktif</span>}</p>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">API Key</label>
            <input
              type="password" value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)}
              className={inputClass} placeholder="sk-..." autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Model (chat)</label>
            <select value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} className={inputClass}>
              {OPENAI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Model (voice / realtime)</label>
            <select value={openaiRealtimeModel} onChange={(e) => setOpenaiRealtimeModel(e.target.value)} className={inputClass}>
              {OPENAI_REALTIME_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-white/30">Dipakai untuk fitur Voice Conversation (kalau diaktifkan di bawah)</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Persona Agent</label>
          <textarea
            value={agentPersona} onChange={(e) => setAgentPersona(e.target.value)}
            rows={4} className={textareaClass}
            placeholder="Contoh: Kamu adalah asisten jaringan profesional yang membantu reseller ISP mengelola MikroTik mereka..."
          />
          <p className="text-xs text-gray-400 dark:text-white/30">Karakter dan gaya komunikasi agent kepada user</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Knowledge Base</label>
          <textarea
            value={agentKnowledge} onChange={(e) => setAgentKnowledge(e.target.value)}
            rows={5} className={textareaClass}
            placeholder="Contoh: Semua user adalah reseller ISP dengan jaringan FTTH. Router yang digunakan umumnya RB series dengan RouterOS 6.x atau 7.x..."
          />
          <p className="text-xs text-gray-400 dark:text-white/30">Konteks bisnis dan pengetahuan khusus yang perlu diketahui agent</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Batas Chat per Hari (per user)</label>
          <input
            type="number" min={1} max={9999} value={dailyChatLimit} onChange={(e) => setDailyChatLimit(e.target.value)}
            className={inputClass} placeholder="50"
          />
        </div>

        <button type="submit" disabled={agentLoading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
          {agentLoading ? "Menyimpan..." : "Simpan Pengaturan Agent"}
        </button>
      </form>

      {/* Voice Conversation */}
      <form onSubmit={handleSaveVoice} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Voice Conversation</h2>

        <div className="flex items-center justify-between">
          <div className="pr-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Aktifkan Voice Call Realtime</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">Tombol kirim di chat user berubah jadi tombol telepon saat input kosong. Hanya jalan dengan provider OpenAI + API key terisi.</p>
          </div>
          <button
            type="button"
            onClick={() => setVoiceCallEnabled((v) => !v)}
            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceCallEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceCallEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        {voiceCallEnabled && llmProvider !== "openai" && (
          <div className="text-xs px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
            Provider aktif saat ini: <strong>{llmProvider}</strong>. Ganti ke <strong>OpenAI</strong> di section atas & simpan dulu, baru aktifkan voice.
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Batas Durasi Voice per Hari (detik, per user)</label>
          <input
            type="number" min={30} max={3600} step={30}
            value={voiceDailySeconds} onChange={(e) => setVoiceDailySeconds(e.target.value)}
            className={inputClass} placeholder="180"
          />
          <p className="text-xs text-gray-400 dark:text-white/30">Default 180 detik (3 menit). Voice mahal — set hati-hati.</p>
        </div>

        <button type="submit" disabled={voiceLoading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
          {voiceLoading ? "Menyimpan..." : "Simpan Pengaturan Voice"}
        </button>
      </form>

      {/* Ganti Password */}
      <form onSubmit={handleUpdatePassword} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Ganti Password</h2>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Password Baru</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClass} placeholder="Min. 8 karakter" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-white/60">Konfirmasi Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
        </div>
        <button type="submit" disabled={passLoading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
          {passLoading ? "Menyimpan..." : "Perbarui Password"}
        </button>
      </form>
    </div>
  );
}
