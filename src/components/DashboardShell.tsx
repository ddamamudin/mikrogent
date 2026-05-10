"use client";

import { User, RouterConfig } from "@/generated/prisma/client";
import { useState, useEffect, useCallback } from "react";

type Props = { user: User; routerConfig: RouterConfig };

const menuItems = [
  { id: "home",     label: "Dashboard",      icon: "🏠" },
  { id: "users",    label: "Hotspot Users",   icon: "👥" },
  { id: "active",   label: "User Aktif",      icon: "🟢" },
  { id: "profiles", label: "User Profiles",   icon: "📋" },
  { id: "voucher",  label: "Voucher",         icon: "🎟️" },
  { id: "report",   label: "Laporan",         icon: "📊" },
];

export default function DashboardShell({ user, routerConfig }: Props) {
  const [activeMenu, setActiveMenu] = useState("home");

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <aside className="w-56 bg-slate-800 border-r border-white/10 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-blue-400 font-bold text-lg">Mikroplay</div>
          <div className="text-white/40 text-xs mt-0.5 truncate">{user.subdomain}.mikroplay.com</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                activeMenu === item.id
                  ? "bg-blue-600 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-white/60 text-xs truncate">{user.name}</div>
          <div className="text-white/30 text-xs truncate">{user.email}</div>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{menuItems.find((m) => m.id === activeMenu)?.label}</h1>
            <p className="text-white/40 text-sm">Router: {routerConfig.routerIp}</p>
          </div>
        </div>

        {activeMenu === "home"     && <DashboardHome subdomain={user.subdomain} />}
        {activeMenu === "users"    && <HotspotUsers subdomain={user.subdomain} />}
        {activeMenu === "active"   && <ActiveUsers subdomain={user.subdomain} />}
        {activeMenu === "profiles" && <UserProfiles subdomain={user.subdomain} />}
        {(activeMenu === "voucher" || activeMenu === "report") && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/40">
            Fitur ini sedang dalam pengembangan 🚧
          </div>
        )}
      </main>
    </div>
  );
}

// ── Dashboard Home ──────────────────────────────────────────────────────────
function DashboardHome({ subdomain }: { subdomain: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=dashboard`);
    const d = await res.json();
    if (!res.ok) setError(d.error);
    else setData(d);
  }, [subdomain]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <LoadingBox />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🌐" label="Router" value={data.routerName} sub={data.routerIp} />
        <StatCard icon="⏱️" label="Uptime" value={data.uptime} sub={`v${data.version}`} />
        <StatCard icon="👥" label="Total Users" value={data.totalUsers} sub="hotspot users" />
        <StatCard icon="🟢" label="User Aktif" value={data.activeUsers} sub="saat ini" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-white/60">CPU Load</span>
            <span className="text-sm font-bold">{data.cpuLoad}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${data.cpuLoad > 80 ? "bg-red-500" : data.cpuLoad > 50 ? "bg-yellow-500" : "bg-blue-500"}`}
              style={{ width: `${data.cpuLoad}%` }}
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-white/60">Memory</span>
            <span className="text-sm font-bold">{data.usedMemMB}/{data.totalMemMB} MB ({data.memPercent}%)</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${data.memPercent > 80 ? "bg-red-500" : data.memPercent > 60 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${data.memPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hotspot Users ───────────────────────────────────────────────────────────
function HotspotUsers({ subdomain }: { subdomain: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", password: "", profile: "default", comment: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=users`);
    const d = await res.json();
    setLoading(false);
    if (!res.ok) setError(d.error);
    else setUsers(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/router/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, action: "add-user", params: newUser }),
    });
    setSaving(false);
    setShowAdd(false);
    setNewUser({ name: "", password: "", profile: "default", comment: "" });
    load();
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Hapus user ini?")) return;
    await fetch("/api/router/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, action: "remove-user", params: { ".id": id } }),
    });
    load();
  };

  const handleToggle = async (id: string, disabled: boolean) => {
    await fetch("/api/router/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, action: disabled ? "enable-user" : "disable-user", params: { ".id": id } }),
    });
    load();
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;

  const filtered = users.filter((u) =>
    !search || u["name"]?.toLowerCase().includes(search.toLowerCase()) || u["comment"]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari username..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition">
          + Tambah User
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Tambah User Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required placeholder="Username" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required placeholder="Password" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input value={newUser.profile} onChange={(e) => setNewUser((p) => ({ ...p, profile: e.target.value }))} placeholder="Profile (default)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input value={newUser.comment} onChange={(e) => setNewUser((p) => ({ ...p, comment: e.target.value }))} placeholder="Komentar (opsional)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition">{saving ? "Menyimpan..." : "Simpan"}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Profile</th>
              <th className="text-left px-4 py-3">Comment</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-white/30">Memuat...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-white/30">Tidak ada user</td></tr>
            ) : filtered.map((u) => (
              <tr key={u[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 font-mono">{u["name"]}</td>
                <td className="px-4 py-3 text-white/60">{u["profile"] || "-"}</td>
                <td className="px-4 py-3 text-white/40 text-xs">{u["comment"] || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u["disabled"] === "true" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                    {u["disabled"] === "true" ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(u[".id"], u["disabled"] === "true")} className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition">
                      {u["disabled"] === "true" ? "Enable" : "Disable"}
                    </button>
                    <button onClick={() => handleRemove(u[".id"])} className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-white/30 text-xs">{filtered.length} user ditemukan</p>
    </div>
  );
}

// ── Active Users ────────────────────────────────────────────────────────────
function ActiveUsers({ subdomain }: { subdomain: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=active`);
    const d = await res.json();
    setLoading(false);
    if (!res.ok) setError(d.error);
    else setUsers(d);
  }, [subdomain]);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const handleRemove = async (id: string) => {
    await fetch("/api/router/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, action: "remove-active", params: { ".id": id } }),
    });
    load();
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <p className="text-white/40 text-sm">Auto refresh setiap 5 detik • {users.length} user aktif</p>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">IP Address</th>
              <th className="text-left px-4 py-3">MAC Address</th>
              <th className="text-left px-4 py-3">Uptime</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-white/30">Memuat...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-white/30">Tidak ada user aktif</td></tr>
            ) : users.map((u) => (
              <tr key={u[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 font-mono">{u["user"]}</td>
                <td className="px-4 py-3 font-mono text-white/70">{u["address"]}</td>
                <td className="px-4 py-3 font-mono text-white/50 text-xs">{u["mac-address"]}</td>
                <td className="px-4 py-3 text-white/60">{u["uptime"]}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleRemove(u[".id"])} className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition">
                    Kick
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── User Profiles ───────────────────────────────────────────────────────────
function UserProfiles({ subdomain }: { subdomain: string }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/router/data?subdomain=${subdomain}&cmd=profiles`)
      .then((r) => r.json())
      .then((d) => { setLoading(false); if (Array.isArray(d)) setProfiles(d); else setError(d.error); })
      .catch(() => setLoading(false));
  }, [subdomain]);

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/50">
            <th className="text-left px-4 py-3">Nama Profile</th>
            <th className="text-left px-4 py-3">Rate Limit</th>
            <th className="text-left px-4 py-3">Session Timeout</th>
            <th className="text-left px-4 py-3">Shared Users</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} className="text-center py-8 text-white/30">Memuat...</td></tr>
          ) : profiles.map((p) => (
            <tr key={p[".id"]} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-3 font-semibold">{p["name"]}</td>
              <td className="px-4 py-3 font-mono text-white/60 text-xs">{p["rate-limit"] || "-"}</td>
              <td className="px-4 py-3 text-white/60">{p["session-timeout"] || "∞"}</td>
              <td className="px-4 py-3 text-white/60">{p["shared-users"] || "1"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared UI ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: any; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-white/50 text-xs mb-1">{label}</div>
      <div className="font-bold">{value}</div>
      {sub && <div className="text-white/30 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30">
      Memuat data router...
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <p className="text-red-400 mb-3">⚠️ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition">
          Coba Lagi
        </button>
      )}
    </div>
  );
}
