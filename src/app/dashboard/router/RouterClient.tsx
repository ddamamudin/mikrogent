"use client";

import { useState } from "react";

type Initial = { host: string; port: number; sshUser: string; sshPass: string; connected: boolean } | null;

const inputClass = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:border-blue-500";

export default function RouterClient({ initial }: { initial: Initial }) {
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(initial ? String(initial.port) : "");
  const [sshUser, setSshUser] = useState(initial?.sshUser ?? "");
  const [sshPass, setSshPass] = useState(initial?.sshPass ?? "");
  const [connected, setConnected] = useState<boolean>(initial?.connected ?? false);
  const [showPass, setShowPass] = useState(false);

  const [pingState, setPingState] = useState<{ status: "idle" | "ok" | "fail" | "loading"; msg?: string }>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const portNum = (): number | null => {
    if (!port.trim()) return 22;
    const n = parseInt(port, 10);
    if (!Number.isFinite(n) || n < 1 || n > 65535) return null;
    return n;
  };

  const handlePing = async () => {
    if (!host) return showMsg("err", "Host wajib diisi");
    const p = portNum();
    if (p === null) return showMsg("err", "Port harus angka 1-65535");
    setPingState({ status: "loading" });
    const res = await fetch("/api/account/router/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: p }),
    });
    const data = await res.json();
    if (data.ok) setPingState({ status: "ok", msg: `Port ${p} terbuka (${data.latencyMs}ms)` });
    else setPingState({ status: "fail", msg: data.error || `Gagal connect ke port ${p}` });
  };

  const handleSaveAndVerify = async () => {
    if (!host || !sshUser || !sshPass) return showMsg("err", "Host, username, password wajib diisi");
    const p = portNum();
    if (p === null) return showMsg("err", "Port harus angka 1-65535");
    setSaving(true);
    const saveRes = await fetch("/api/account/router", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: p, sshUser, sshPass }),
    });
    setSaving(false);
    if (!saveRes.ok) {
      const d = await saveRes.json();
      return showMsg("err", d.error || "Gagal menyimpan");
    }

    setVerifying(true);
    const vRes = await fetch("/api/account/router/verify", { method: "POST" });
    setVerifying(false);
    const data = await vRes.json();
    if (vRes.ok) {
      setConnected(true);
      showMsg("ok", "Berhasil terhubung — konfigurasi sudah dipelajari Replay Agent");
    } else {
      setConnected(false);
      showMsg("err", `Gagal konek: ${data.error || "unknown"}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Hapus kredensial MikroTik? Replay Agent akan kehilangan akses ke router kamu sampai diisi ulang.")) return;
    setDeleting(true);
    const res = await fetch("/api/account/router", { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setHost(""); setPort(""); setSshUser(""); setSshPass(""); setConnected(false);
      setPingState({ status: "idle" });
      showMsg("ok", "Kredensial dihapus");
    } else showMsg("err", "Gagal menghapus");
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg ${message.type === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"}`}>
          {message.text}
        </div>
      )}

      {/* Status pill */}
      <div className={`text-sm px-4 py-3 rounded-lg border flex items-center gap-2 ${
        connected
          ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
          : initial
            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
            : "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/5"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : initial ? "bg-amber-500" : "bg-gray-400"}`} />
        {connected ? "Router terhubung — Replay Agent siap pakai" : initial ? "Kredensial tersimpan, tapi belum terverifikasi" : "Belum ada kredensial"}
      </div>

      {/* Persiapan */}
      <details className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 px-5 py-3 text-sm text-gray-700 dark:text-white/70 shadow-sm">
        <summary className="cursor-pointer font-medium text-gray-900 dark:text-white">📘 Persiapan sebelum isi form (klik untuk buka)</summary>
        <div className="mt-3 space-y-2 text-gray-600 dark:text-white/60">
          <p><strong className="text-gray-900 dark:text-white">1. Aktifkan SSH di MikroTik.</strong> Default port 22 atau bebas — Winbox → New Terminal:</p>
          <pre className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-xs overflow-x-auto"><code>/ip service set ssh disabled=no</code></pre>
          <p><strong className="text-gray-900 dark:text-white">2. Pakai user yang udah ada</strong> dengan group <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">write</code> atau <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">full</code>, atau bikin baru:</p>
          <pre className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-xs overflow-x-auto"><code>{`/user add name=USERNAME password=PASSWORD group=write`}</code></pre>
          <p><strong className="text-gray-900 dark:text-white">3. Catat IP public router</strong> dan port SSH yang Kakak pakai.</p>
        </div>
      </details>

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSaveAndVerify(); }}>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-white/50 uppercase tracking-wider">Setting Router</h2>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Host / IP Public Router</label>
            <input type="text" value={host} onChange={(e) => { setHost(e.target.value); setPingState({ status: "idle" }); }}
              placeholder="103.xx.xx.xx" className={inputClass} />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Port SSH</label>
            <input type="number" min={1} max={65535} value={port}
              onChange={(e) => { setPort(e.target.value); setPingState({ status: "idle" }); }}
              placeholder="22" className={inputClass} />
            <p className="text-xs text-gray-400 dark:text-white/30">Default 22. Kosongkan kalau pakai default.</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Username</label>
            <input type="text" value={sshUser} onChange={(e) => setSshUser(e.target.value)}
              placeholder="username MikroTik" className={inputClass} />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-white/60">Password</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={sshPass} onChange={(e) => setSshPass(e.target.value)}
                placeholder="password MikroTik" className={`${inputClass} pr-20`} />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer">
                {showPass ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
          </div>

          {pingState.status !== "idle" && (
            <div className={`text-sm rounded-lg px-3 py-2 border ${
              pingState.status === "ok" ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20" :
              pingState.status === "fail" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" :
              "bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/5"
            }`}>
              {pingState.status === "loading" ? `Mengecek port ${portNum() ?? "?"}...` : pingState.msg}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={handlePing} disabled={pingState.status === "loading" || !host}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 text-gray-700 dark:text-white/70 text-sm font-medium transition">
              {pingState.status === "loading" ? "Cek..." : "Cek Port"}
            </button>
            <button type="submit" disabled={saving || verifying || !host || !sshUser || !sshPass}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition">
              {saving ? "Menyimpan..." : verifying ? "Tes Koneksi..." : "Simpan & Tes Koneksi"}
            </button>
          </div>
        </div>
      </form>

      {initial && (
        <button onClick={handleDelete} disabled={deleting}
          className="w-full px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 text-sm font-medium transition border border-red-100 dark:border-red-500/20">
          {deleting ? "Menghapus..." : "Hapus Kredensial"}
        </button>
      )}
    </div>
  );
}
