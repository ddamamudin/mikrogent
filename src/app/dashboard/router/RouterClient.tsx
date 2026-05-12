"use client";

import { useState } from "react";

type Initial = { host: string; port: number; sshUser: string; sshPass: string; connected: boolean } | null;

export default function RouterClient({ initial }: { initial: Initial }) {
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(String(initial?.port ?? 22));
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
    if (!host || !sshUser || !sshPass) return showMsg("err", "Semua field wajib diisi");
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
      setHost(""); setSshUser(""); setSshPass(""); setConnected(false);
      setPingState({ status: "idle" });
      showMsg("ok", "Kredensial dihapus");
    } else showMsg("err", "Gagal menghapus");
  };

  const inputClass = "w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-gray-200 transition text-[15px]";
  const labelClass = "text-sm font-medium text-gray-500 px-1";

  return (
    <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Router MikroTik</h1>
        <p className="text-sm text-gray-500 mt-1">
          Atur kredensial koneksi router kamu. Agent pakai info ini untuk SSH ke MikroTik.
        </p>
      </div>

      {/* Status pill */}
      <div className={`rounded-2xl px-4 py-3 text-sm flex items-center gap-2.5 ${
        connected
          ? "bg-green-50 border border-green-100 text-green-700"
          : initial
            ? "bg-amber-50 border border-amber-100 text-amber-700"
            : "bg-gray-50 border border-gray-100 text-gray-500"
      }`}>
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : initial ? "bg-amber-500" : "bg-gray-400"}`} />
        <span>
          {connected ? "Router terhubung — Replay Agent siap pakai" : initial ? "Kredensial tersimpan, tapi belum terverifikasi" : "Belum ada kredensial"}
        </span>
      </div>

      {/* Persiapan */}
      <details className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-900">
        <summary className="cursor-pointer font-medium">📘 Persiapan sebelum isi form (klik untuk buka)</summary>
        <div className="mt-3 space-y-2 text-blue-800">
          <p><strong>1. Pastikan port SSH 22 aktif di MikroTik.</strong> Buka Winbox → New Terminal → paste:</p>
          <pre className="bg-white border border-blue-100 rounded-lg p-2 text-xs overflow-x-auto"><code>/ip service set ssh port=22 disabled=no</code></pre>
          <p><strong>2. Punya user SSH dengan group <code className="bg-blue-100 px-1 rounded">write</code> atau <code className="bg-blue-100 px-1 rounded">full</code>.</strong> Kalau belum, bikin baru:</p>
          <pre className="bg-white border border-blue-100 rounded-lg p-2 text-xs overflow-x-auto"><code>{`/user add name=USERNAME password=PASSWORD group=write`}</code></pre>
          <p><strong>3. Tau IP public router</strong> (cek di Winbox di address bar, biasanya format <code className="bg-blue-100 px-1 rounded">xxx.xxx.xxx.xxx</code>).</p>
        </div>
      </details>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          message.type === "ok" ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-600"
        }`}>{message.text}</div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Host / IP Public Router</label>
          <input type="text" value={host} onChange={(e) => { setHost(e.target.value); setPingState({ status: "idle" }); }}
            placeholder="103.xx.xx.xx" className={`${inputClass} font-mono`} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Port SSH</label>
          <input type="number" min={1} max={65535} value={port}
            onChange={(e) => { setPort(e.target.value); setPingState({ status: "idle" }); }}
            placeholder="22" className={`${inputClass} font-mono`} />
          <p className="text-xs text-gray-400 px-1">Default 22. Kalau Kakak set SSH di port lain (mis. 2222), isi sesuai port di MikroTik.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Username SSH</label>
          <input type="text" value={sshUser} onChange={(e) => setSshUser(e.target.value)}
            placeholder="username SSH MikroTik" className={`${inputClass} font-mono`} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Password SSH</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={sshPass} onChange={(e) => setSshPass(e.target.value)}
              placeholder="password SSH" className={`${inputClass} font-mono pr-20`} />
            <button type="button" onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer">
              {showPass ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
        </div>

        {/* Ping result */}
        {pingState.status !== "idle" && (
          <div className={`text-sm rounded-xl px-4 py-3 ${
            pingState.status === "ok" ? "bg-green-50 border border-green-100 text-green-700" :
            pingState.status === "fail" ? "bg-red-50 border border-red-100 text-red-600" :
            "bg-gray-50 border border-gray-100 text-gray-500"
          }`}>
            {pingState.status === "loading" ? "Mengecek port 22..." : pingState.msg}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={handlePing} disabled={pingState.status === "loading" || !host}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium transition">
            {pingState.status === "loading" ? "Cek..." : `Cek Port ${port || "22"}`}
          </button>
          <button onClick={handleSaveAndVerify} disabled={saving || verifying || !host || !sshUser || !sshPass}
            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition">
            {saving ? "Menyimpan..." : verifying ? "Tes Koneksi..." : "Simpan & Tes Koneksi"}
          </button>
        </div>

        {initial && (
          <button onClick={handleDelete} disabled={deleting}
            className="w-full mt-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-medium transition border border-red-100">
            {deleting ? "Menghapus..." : "Hapus Kredensial"}
          </button>
        )}
      </div>
    </div>
  );
}
