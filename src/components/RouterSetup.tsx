"use client";

import { useState } from "react";

export default function RouterSetup({ subdomain, userName }: { subdomain: string; userName: string }) {
  const [form, setForm] = useState({ routerIp: "", routerUser: "admin", routerPass: "", hotspotName: "", apiPort: "8728" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/router/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, ...form, apiPort: Number(form.apiPort) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Gagal menyimpan");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Selamat datang, {userName}! 👋</h1>
          <p className="text-white/50 mt-2">Hubungkan router MikroTik Anda untuk mulai</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm text-white/70 mb-1">IP Router</label>
              <input
                value={form.routerIp}
                onChange={(e) => setForm((p) => ({ ...p, routerIp: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">API Port</label>
              <input
                value={form.apiPort}
                onChange={(e) => setForm((p) => ({ ...p, apiPort: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">Username Router</label>
              <input
                value={form.routerUser}
                onChange={(e) => setForm((p) => ({ ...p, routerUser: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Password Router</label>
              <input
                type="password"
                value={form.routerPass}
                onChange={(e) => setForm((p) => ({ ...p, routerPass: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Nama Hotspot (opsional)</label>
            <input
              value={form.hotspotName}
              onChange={(e) => setForm((p) => ({ ...p, hotspotName: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
              placeholder="hotspot1"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-semibold transition mt-2"
          >
            {loading ? "Menghubungkan..." : "Hubungkan Router"}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-4">
          Pastikan API port MikroTik (8728) accessible dari internet
        </p>
      </div>
    </div>
  );
}
