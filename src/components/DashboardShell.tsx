"use client";

import { User, RouterConfig } from "@/generated/prisma/client";
import { useState, useEffect, useCallback, useRef } from "react";

type Props = { user: User; routerConfig: RouterConfig };

const SECTIONS = [
  { label: "Hotspot", items: [
    { id: "home",        label: "Dashboard",      icon: "🏠" },
    { id: "users",       label: "Users",          icon: "👥" },
    { id: "generate",    label: "Generate User",  icon: "⚡" },
    { id: "quickprint",  label: "Quick Print",    icon: "🖨️" },
    { id: "active",      label: "User Aktif",     icon: "🟢" },
    { id: "profiles",    label: "User Profiles",  icon: "📋" },
    { id: "hosts",       label: "Hosts",          icon: "🔌" },
    { id: "ipbinding",   label: "IP Binding",     icon: "🔗" },
    { id: "cookies",     label: "Cookies",        icon: "🍪" },
    { id: "hslog",       label: "Log",            icon: "📜" },
  ]},
  { label: "PPP", items: [
    { id: "ppp-secrets",  label: "Secrets",       icon: "🔑" },
    { id: "ppp-active",   label: "Active",        icon: "🟢" },
    { id: "ppp-profiles", label: "Profiles",      icon: "📋" },
  ]},
  { label: "Laporan", items: [
    { id: "selling",    label: "Selling Report", icon: "💰" },
    { id: "userlog",    label: "User Log",       icon: "📋" },
  ]},
  { label: "Tools", items: [
    { id: "traffic",          label: "Traffic Monitor",   icon: "📈" },
    { id: "dhcp",             label: "DHCP Leases",       icon: "🔧" },
    { id: "scheduler",        label: "Scheduler",         icon: "⏰" },
    { id: "script-installer", label: "Script Installer",  icon: "📜" },
    { id: "system",           label: "System",            icon: "⚙️" },
  ]},
  { label: "Pengaturan", items: [
    { id: "router-settings", label: "Konfigurasi Router", icon: "🔌" },
    { id: "account",         label: "Akun Saya",          icon: "👤" },
  ]},
];

const allItems = SECTIONS.flatMap((s) => s.items);

export default function DashboardShell({ user, routerConfig }: Props) {
  const [activeMenu, setActiveMenu] = useState("home");
  const current = allItems.find((m) => m.id === activeMenu);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
    window.location.href = `${window.location.protocol}//${appDomain}/login`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <aside className="w-56 bg-slate-800 border-r border-white/10 flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-blue-400 font-bold text-lg">Mikroplay</div>
          <div className="text-white/40 text-xs mt-0.5 truncate">{user.subdomain}.mikroplay.com</div>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {SECTIONS.map((sec) => (
            <div key={sec.label} className="mb-3">
              <div className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 py-1">{sec.label}</div>
              {sec.items.map((item) => (
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
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="text-white/60 text-xs truncate">{user.name}</div>
          <div className="text-white/30 text-xs truncate">{user.email}</div>
          <button onClick={handleLogout}
            className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10 transition text-left">
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold">{current?.label}</h1>
          <p className="text-white/40 text-sm">Router: {routerConfig.routerIp}</p>
        </div>

        {activeMenu === "home"         && <DashboardHome subdomain={user.subdomain} />}
        {activeMenu === "users"        && <HotspotUsers  subdomain={user.subdomain} />}
        {activeMenu === "generate"     && <GenerateUsers subdomain={user.subdomain} routerIp={routerConfig.routerIp} routerName={user.subdomain} />}
        {activeMenu === "quickprint"   && <QuickPrint    subdomain={user.subdomain} routerName={user.subdomain} />}
        {activeMenu === "active"       && <ActiveUsers   subdomain={user.subdomain} />}
        {activeMenu === "profiles"     && <UserProfiles  subdomain={user.subdomain} />}
        {activeMenu === "hosts"        && <HostsList     subdomain={user.subdomain} />}
        {activeMenu === "ipbinding"    && <IpBinding     subdomain={user.subdomain} />}
        {activeMenu === "cookies"      && <CookiesPage   subdomain={user.subdomain} />}
        {activeMenu === "hslog"        && <HotspotLog    subdomain={user.subdomain} />}
        {activeMenu === "ppp-secrets"  && <PppSecrets    subdomain={user.subdomain} />}
        {activeMenu === "ppp-active"   && <PppActive     subdomain={user.subdomain} />}
        {activeMenu === "ppp-profiles" && <PppProfiles   subdomain={user.subdomain} />}
        {activeMenu === "selling"      && <SellingReport subdomain={user.subdomain} />}
        {activeMenu === "userlog"      && <UserLogReport subdomain={user.subdomain} />}
        {activeMenu === "traffic"   && <TrafficMonitor subdomain={user.subdomain} />}
        {activeMenu === "dhcp"      && <DhcpLeases    subdomain={user.subdomain} />}
        {activeMenu === "scheduler"        && <SchedulerPage     subdomain={user.subdomain} />}
        {activeMenu === "script-installer" && <ScriptInstaller   subdomain={user.subdomain} />}
        {activeMenu === "system"           && <SystemPage        subdomain={user.subdomain} routerIp={routerConfig.routerIp} />}
        {activeMenu === "router-settings"  && <RouterSettings    subdomain={user.subdomain} routerConfig={routerConfig} />}
        {activeMenu === "account"          && <AccountSettings   subdomain={user.subdomain} userName={user.name} userEmail={user.email} />}
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
        <StatCard icon="🌐" label="Router"      value={data.routerName} sub={data.routerIp} />
        <StatCard icon="⏱️" label="Uptime"      value={data.uptime}     sub={`v${data.version}`} />
        <StatCard icon="👥" label="Total Users"  value={data.totalUsers}  sub="hotspot users" />
        <StatCard icon="🟢" label="User Aktif"  value={data.activeUsers} sub="saat ini" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GaugeCard label="CPU Load" value={data.cpuLoad} unit="%" colorFn={(v) => v > 80 ? "bg-red-500" : v > 50 ? "bg-yellow-500" : "bg-blue-500"} />
        <GaugeCard label="Memory"   value={data.memPercent} unit="%" extra={`${data.usedMemMB}/${data.totalMemMB} MB`} colorFn={(v) => v > 80 ? "bg-red-500" : v > 60 ? "bg-yellow-500" : "bg-green-500"} />
      </div>
    </div>
  );
}

// ── Hotspot Users ───────────────────────────────────────────────────────────
function HotspotUsers({ subdomain }: { subdomain: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ name: "", password: "", profile: "", comment: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProfile, setFilterProfile] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [ur, pr] = await Promise.all([
      fetch(`/api/router/data?subdomain=${subdomain}&cmd=users`).then((r) => r.json()),
      fetch(`/api/router/data?subdomain=${subdomain}&cmd=profiles`).then((r) => r.json()),
    ]);
    setLoading(false);
    if (Array.isArray(ur)) setUsers(ur);
    else setError(ur.error);
    if (Array.isArray(pr)) setProfiles(pr);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, params: Record<string, string>) => {
    await fetch("/api/router/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, action, params }),
    });
    load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await doAction("add-user", { name: newUser.name, password: newUser.password, profile: newUser.profile || "default", comment: newUser.comment });
    setSaving(false);
    setShowAdd(false);
    setNewUser({ name: "", password: "", profile: "", comment: "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await doAction("edit-user", { ".id": editUser[".id"], name: editUser.name, password: editUser.password, profile: editUser.profile, comment: editUser.comment });
    setSaving(false);
    setEditUser(null);
    load();
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;

  const filtered = users.filter((u) => {
    const matchSearch = !search || u["name"]?.toLowerCase().includes(search.toLowerCase()) || u["comment"]?.toLowerCase().includes(search.toLowerCase());
    const matchProfile = !filterProfile || u["profile"] === filterProfile;
    return matchSearch && matchProfile;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari username / komentar..."
          className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm" />
        <select value={filterProfile} onChange={(e) => setFilterProfile(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Semua Profile</option>
          {profiles.map((p) => <option key={p[".id"]} value={p["name"]}>{p["name"]}</option>)}
        </select>
        <Btn onClick={() => setShowAdd(true)}>+ Tambah</Btn>
        <RemoveExpiredBtn subdomain={subdomain} onDone={load} />
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Tambah User Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={newUser.name}     onChange={(v) => setNewUser((p) => ({ ...p, name: v }))}     placeholder="Username" required />
            <Input value={newUser.password} onChange={(v) => setNewUser((p) => ({ ...p, password: v }))} placeholder="Password" required />
            <select value={newUser.profile} onChange={(e) => setNewUser((p) => ({ ...p, profile: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Pilih Profile</option>
              {profiles.map((p) => <option key={p[".id"]} value={p["name"]}>{p["name"]}</option>)}
            </select>
            <Input value={newUser.comment}  onChange={(v) => setNewUser((p) => ({ ...p, comment: v }))}  placeholder="Komentar (opsional)" />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setShowAdd(false)}>Batal</Btn>
          </div>
        </form>
      )}

      {editUser && (
        <form onSubmit={handleEdit} className="bg-white/5 border border-yellow-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Edit User: <span className="text-yellow-400">{editUser["name"]}</span></h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={editUser.password} onChange={(v) => setEditUser((p: any) => ({ ...p, password: v }))} placeholder="Password baru" />
            <select value={editUser.profile} onChange={(e) => setEditUser((p: any) => ({ ...p, profile: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              {profiles.map((p) => <option key={p[".id"]} value={p["name"]}>{p["name"]}</option>)}
            </select>
            <Input value={editUser.comment}  onChange={(v) => setEditUser((p: any) => ({ ...p, comment: v }))}  placeholder="Komentar" />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving} variant="warning">{saving ? "Menyimpan..." : "Update"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setEditUser(null)}>Batal</Btn>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Profile</th>
              <th className="text-left px-4 py-3">Comment</th>
              <th className="text-left px-4 py-3">Uptime</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : filtered.length === 0 ? <Empty cols={6} /> : filtered.map((u) => (
              <tr key={u[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-sm">{u["name"]}</td>
                <td className="px-4 py-2.5 text-white/60 text-xs">{u["profile"] || "-"}</td>
                <td className="px-4 py-2.5 text-white/40 text-xs">{u["comment"] || "-"}</td>
                <td className="px-4 py-2.5 text-white/50 text-xs">{u["uptime"] || "-"}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={u["disabled"] === "true" ? "red" : "green"}>
                    {u["disabled"] === "true" ? "Disabled" : "Active"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    <Btn size="xs" onClick={() => setEditUser({ ...u })}>Edit</Btn>
                    <Btn size="xs" variant="ghost" onClick={() => doAction(u["disabled"] === "true" ? "enable-user" : "disable-user", { ".id": u[".id"] })}>
                      {u["disabled"] === "true" ? "Enable" : "Disable"}
                    </Btn>
                    <Btn size="xs" variant="ghost" onClick={() => doAction("reset-user", { ".id": u[".id"] })}>Reset</Btn>
                    <Btn size="xs" variant="danger" onClick={() => confirm("Hapus user ini?") && doAction("remove-user", { ".id": u[".id"] })}>Hapus</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-white/30 text-xs">{filtered.length} dari {users.length} user</p>
    </div>
  );
}

// ── Generate Users ──────────────────────────────────────────────────────────
function GenerateUsers({ subdomain, routerIp, routerName }: { subdomain: string; routerIp: string; routerName: string }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [form, setForm] = useState({ qty: 10, prefix: "", length: 6, charType: "alpha", mode: "vc", profile: "", comment: "", limitUptime: "", limitBytes: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Array<{ name: string; password: string }> | null>(null);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/router/data?subdomain=${subdomain}&cmd=profiles`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProfiles(d); });
  }, [subdomain]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/router/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, ...form }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) setError(d.error);
    else setResult(d.users);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Voucher ${routerName}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:10px;background:#fff;color:#000;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .card{border:1px dashed #999;border-radius:8px;padding:10px;page-break-inside:avoid;font-size:11px;}
  .card .title{font-weight:bold;font-size:12px;text-align:center;margin-bottom:6px;border-bottom:1px solid #ddd;padding-bottom:4px;}
  .card .row{display:flex;justify-content:space-between;margin:2px 0;}
  .card .label{color:#666;}
  .card .value{font-weight:bold;font-family:monospace;}
  @media print{body{padding:0;}.grid{gap:4px;}}
</style></head><body>
<div class="grid">${result!.map((u) => `
<div class="card">
  <div class="title">${routerName.toUpperCase()}</div>
  <div class="row"><span class="label">User</span><span class="value">${u.name}</span></div>
  ${form.mode !== "vc" ? `<div class="row"><span class="label">Pass</span><span class="value">${u.password}</span></div>` : ""}
  <div class="row"><span class="label">Profile</span><span class="value">${form.profile || "default"}</span></div>
</div>`).join("")}
</div>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleGenerate} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Jumlah</label>
            <input type="number" min={1} max={500} value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Prefix (opsional)</label>
            <input type="text" value={form.prefix} onChange={(e) => setForm((p) => ({ ...p, prefix: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="mis: vch-" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Panjang (3-12)</label>
            <input type="number" min={3} max={12} value={form.length} onChange={(e) => setForm((p) => ({ ...p, length: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Tipe Karakter</label>
            <select value={form.charType} onChange={(e) => setForm((p) => ({ ...p, charType: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="alpha">Huruf + Angka</option>
              <option value="lowercase">Huruf Kecil</option>
              <option value="uppercase">Huruf Besar</option>
              <option value="numeric">Angka saja</option>
              <option value="mixed">Campur (huruf besar+kecil)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Mode</label>
            <select value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="vc">Username = Password (Voucher)</option>
              <option value="up">Username & Password terpisah</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Profile</label>
            <select value={form.profile} onChange={(e) => setForm((p) => ({ ...p, profile: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">default</option>
              {profiles.map((p) => <option key={p[".id"]} value={p["name"]}>{p["name"]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Komentar</label>
            <input type="text" value={form.comment} onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Limit Uptime (mis: 1d, 2h)</label>
            <input type="text" value={form.limitUptime} onChange={(e) => setForm((p) => ({ ...p, limitUptime: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Kosongkan = tidak ada limit" />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Limit Data (bytes, mis: 1073741824=1GB)</label>
            <input type="text" value={form.limitBytes} onChange={(e) => setForm((p) => ({ ...p, limitBytes: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Kosongkan = tidak ada limit" />
          </div>
        </div>
        {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">{error}</div>}
        <Btn type="submit" disabled={loading}>{loading ? `Membuat ${form.qty} user...` : `Generate ${form.qty} User`}</Btn>
      </form>

      {result && (
        <div className="space-y-3" ref={printRef}>
          <div className="flex items-center justify-between">
            <p className="text-green-400 text-sm font-semibold">{result.length} user berhasil dibuat</p>
            <Btn onClick={handlePrint} variant="success">🖨️ Print Voucher</Btn>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-xs">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Username</th>
                  <th className="text-left px-4 py-3">Password</th>
                  <th className="text-left px-4 py-3">Profile</th>
                </tr>
              </thead>
              <tbody>
                {result.map((u, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-2 text-white/30 text-xs">{i + 1}</td>
                    <td className="px-4 py-2 font-mono">{u.name}</td>
                    <td className="px-4 py-2 font-mono text-white/70">{form.mode === "vc" ? u.name : u.password}</td>
                    <td className="px-4 py-2 text-white/50 text-xs">{form.profile || "default"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

  const kick = async (id: string) => {
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action: "remove-active", params: { ".id": id } }) });
    load();
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-sm">Auto refresh 5s • {users.length} aktif</p>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">IP</th>
              <th className="text-left px-4 py-3">MAC</th>
              <th className="text-left px-4 py-3">Uptime</th>
              <th className="text-left px-4 py-3">Bytes In/Out</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : users.length === 0 ? <Empty cols={6} text="Tidak ada user aktif" /> : users.map((u) => (
              <tr key={u[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono">{u["user"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/70">{u["address"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/50">{u["mac-address"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{u["uptime"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/40">{fmtBytes(u["bytes-in"])} / {fmtBytes(u["bytes-out"])}</td>
                <td className="px-4 py-2.5"><Btn size="xs" variant="danger" onClick={() => kick(u[".id"])}>Kick</Btn></td>
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
  const [showAdd, setShowAdd] = useState(false);
  const [editP, setEditP] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const blank = { name: "", "rate-limit": "", "session-timeout": "", "shared-users": "1", "address-pool": "" };
  const [form, setForm] = useState({ ...blank });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=profiles`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setProfiles(d);
    else setError(d.error);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, params: Record<string, string>) => {
    setSaving(true);
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action, params }) });
    setSaving(false);
    load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = { name: form.name };
    if (form["rate-limit"])      params["rate-limit"]      = form["rate-limit"];
    if (form["session-timeout"]) params["session-timeout"] = form["session-timeout"];
    if (form["shared-users"])    params["shared-users"]    = form["shared-users"];
    if (form["address-pool"])    params["address-pool"]    = form["address-pool"];
    await doAction("add-profile", params);
    setShowAdd(false);
    setForm({ ...blank });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doAction("edit-profile", {
      ".id": editP[".id"],
      "rate-limit":      editP["rate-limit"] || "",
      "session-timeout": editP["session-timeout"] || "",
      "shared-users":    editP["shared-users"] || "1",
    });
    setEditP(null);
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => { setShowAdd(true); setEditP(null); }}>+ Tambah Profile</Btn>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Profile Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nama *</label><Input value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Rate Limit (up/down)</label><Input value={form["rate-limit"]} onChange={(v) => setForm((p) => ({ ...p, "rate-limit": v }))} placeholder="mis: 2M/5M" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Session Timeout</label><Input value={form["session-timeout"]} onChange={(v) => setForm((p) => ({ ...p, "session-timeout": v }))} placeholder="mis: 1d, 8h, 30m" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Shared Users</label><Input value={form["shared-users"]} onChange={(v) => setForm((p) => ({ ...p, "shared-users": v }))} placeholder="1" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Address Pool</label><Input value={form["address-pool"]} onChange={(v) => setForm((p) => ({ ...p, "address-pool": v }))} placeholder="hs-pool (opsional)" /></div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setShowAdd(false)}>Batal</Btn>
          </div>
        </form>
      )}

      {editP && (
        <form onSubmit={handleEdit} className="bg-white/5 border border-yellow-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Edit: <span className="text-yellow-400">{editP.name}</span></h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Rate Limit</label><Input value={editP["rate-limit"] || ""} onChange={(v) => setEditP((p: any) => ({ ...p, "rate-limit": v }))} placeholder="mis: 2M/5M" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Session Timeout</label><Input value={editP["session-timeout"] || ""} onChange={(v) => setEditP((p: any) => ({ ...p, "session-timeout": v }))} placeholder="mis: 1d, 8h" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Shared Users</label><Input value={editP["shared-users"] || "1"} onChange={(v) => setEditP((p: any) => ({ ...p, "shared-users": v }))} /></div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving} variant="warning">{saving ? "Menyimpan..." : "Update"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setEditP(null)}>Batal</Btn>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left px-4 py-3">Rate Limit</th>
              <th className="text-left px-4 py-3">Session Timeout</th>
              <th className="text-left px-4 py-3">Shared Users</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={5} /> : profiles.map((p) => (
              <tr key={p[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-semibold">{p["name"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/60">{p["rate-limit"] || "-"}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{p["session-timeout"] || "∞"}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{p["shared-users"] || "1"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Btn size="xs" onClick={() => { setEditP({ ...p }); setShowAdd(false); }}>Edit</Btn>
                    <Btn size="xs" variant="danger" onClick={() => confirm(`Hapus profile ${p["name"]}?`) && doAction("remove-profile", { ".id": p[".id"] })}>Hapus</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Hosts ───────────────────────────────────────────────────────────────────
function HostsList({ subdomain }: { subdomain: string }) {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=hosts&filter=${filter}`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setHosts(d);
  }, [subdomain, filter]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action: "remove-host", params: { ".id": id } }) });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["", "authorized", "bypassed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === f ? "bg-blue-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {f === "" ? "Semua" : f === "authorized" ? "Authorized" : "Bypassed"}
          </button>
        ))}
        <span className="ml-auto text-white/30 text-sm self-center">{hosts.length} host</span>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">MAC</th>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">Server</th>
              <th className="text-left px-4 py-3">Comment</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : hosts.length === 0 ? <Empty cols={6} /> : hosts.map((h) => (
              <tr key={h[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-xs">{h["mac-address"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/70">{h["address"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{h["server"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/40">{h["comment"] || "-"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {h["authorized"] === "true" && <Badge variant="green">A</Badge>}
                    {h["bypassed"] === "true" && <Badge variant="blue">P</Badge>}
                    {h["dynamic"] === "true" && <Badge variant="gray">D</Badge>}
                  </div>
                </td>
                <td className="px-4 py-2.5"><Btn size="xs" variant="danger" onClick={() => remove(h[".id"])}>Hapus</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── IP Binding ──────────────────────────────────────────────────────────────
function IpBinding({ subdomain }: { subdomain: string }) {
  const [bindings, setBindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ "mac-address": "", address: "", "to-address": "", server: "all", type: "regular" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=ipbinding`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setBindings(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, id: string) => {
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action, params: { ".id": id } }) });
    load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const params: Record<string, string> = { "mac-address": form["mac-address"], type: form.type };
    if (form.address)       params.address         = form.address;
    if (form["to-address"]) params["to-address"]   = form["to-address"];
    if (form.server && form.server !== "all") params.server = form.server;
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action: "add-ipbinding", params }) });
    setSaving(false);
    setShowAdd(false);
    setForm({ "mac-address": "", address: "", "to-address": "", server: "all", type: "regular" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-white/30 text-sm">{bindings.length} binding</p>
        <Btn onClick={() => setShowAdd(true)}>+ Tambah Binding</Btn>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Tambah IP Binding</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">MAC Address *</label><Input value={form["mac-address"]} onChange={v => setForm(p => ({ ...p, "mac-address": v }))} placeholder="AA:BB:CC:DD:EE:FF" required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Tipe</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="regular">Regular</option>
                <option value="bypassed">Bypassed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Address (opsional)</label><Input value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="192.168.1.100" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">To Address (opsional)</label><Input value={form["to-address"]} onChange={v => setForm(p => ({ ...p, "to-address": v }))} placeholder="10.0.0.100" /></div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Batal</Btn>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">MAC</th>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">To Address</th>
              <th className="text-left px-4 py-3">Server</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : bindings.length === 0 ? <Empty cols={6} /> : bindings.map((b) => (
              <tr key={b[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-xs">{b["mac-address"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/70">{b["address"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/50">{b["to-address"] || "-"}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{b["server"]}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={b["disabled"] === "true" ? "red" : "green"}>
                    {b["bypassed"] === "true" ? "Bypassed" : b["disabled"] === "true" ? "Disabled" : "Active"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Btn size="xs" variant="ghost" onClick={() => doAction(b["disabled"] === "true" ? "enable-ipbinding" : "disable-ipbinding", b[".id"])}>
                      {b["disabled"] === "true" ? "Enable" : "Disable"}
                    </Btn>
                    <Btn size="xs" variant="danger" onClick={() => confirm("Hapus binding ini?") && doAction("remove-ipbinding", b[".id"])}>Hapus</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Hotspot Log ─────────────────────────────────────────────────────────────
function HotspotLog({ subdomain }: { subdomain: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=logs`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setLogs(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) => !search || l["message"]?.toLowerCase().includes(search.toLowerCase()) || l["time"]?.includes(search));

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari log..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm" />
        <Btn onClick={load} variant="ghost">Refresh</Btn>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Waktu</th>
              <th className="text-left px-4 py-3">Topics</th>
              <th className="text-left px-4 py-3">Pesan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={3} /> : filtered.length === 0 ? <Empty cols={3} /> : filtered.slice(0, 200).map((l, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2 text-xs text-white/50 whitespace-nowrap">{l["time"]}</td>
                <td className="px-4 py-2 text-xs text-white/40">{l["topics"]}</td>
                <td className="px-4 py-2 text-xs font-mono">{l["message"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Selling Report ──────────────────────────────────────────────────────────
function SellingReport({ subdomain }: { subdomain: string }) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=scripts&comment=mikhmon`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setScripts(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  // Mikhmon stores: name = "date-|-time-|-user-|-price-|-address-|-mac-|-validity-|-profile-|-comment"
  const rows = scripts.map((s) => {
    const parts = (s["name"] || "").split("-|-");
    return {
      id: s[".id"],
      date:     parts[0] || "-",
      time:     parts[1] || "-",
      user:     parts[2] || "-",
      price:    parts[3] || "-",
      address:  parts[4] || "-",
      mac:      parts[5] || "-",
      validity: parts[6] || "-",
      profile:  parts[7] || "-",
      comment:  parts[8] || "-",
    };
  }).filter((r) => !search || r.user.toLowerCase().includes(search.toLowerCase()) || r.profile.toLowerCase().includes(search.toLowerCase()));

  const total = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);

  if (!loading && scripts.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-2">
        <p className="text-white/50">Tidak ada data laporan</p>
        <p className="text-white/30 text-xs">Selling report membutuhkan script mikhmon yang tersimpan di router.<br />Pastikan on-login script di profile sudah dikonfigurasi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user / profile..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm" />
        <Btn onClick={load} variant="ghost">Refresh</Btn>
      </div>
      {total > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-green-400 text-sm">Total Pendapatan</span>
          <span className="text-green-400 font-bold text-lg">Rp {total.toLocaleString("id-ID")}</span>
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Tanggal</th>
              <th className="text-left px-4 py-3">Waktu</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Profile</th>
              <th className="text-left px-4 py-3">Harga</th>
              <th className="text-left px-4 py-3">Validity</th>
              <th className="text-left px-4 py-3">MAC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={7} /> : rows.length === 0 ? <Empty cols={7} /> : rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2 text-xs text-white/60">{r.date}</td>
                <td className="px-4 py-2 text-xs text-white/60">{r.time}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.user}</td>
                <td className="px-4 py-2 text-xs text-white/60">{r.profile}</td>
                <td className="px-4 py-2 text-xs text-green-400">Rp {Number(r.price).toLocaleString("id-ID")}</td>
                <td className="px-4 py-2 text-xs text-white/50">{r.validity}</td>
                <td className="px-4 py-2 font-mono text-xs text-white/40">{r.mac}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── User Log ────────────────────────────────────────────────────────────────
function UserLogReport({ subdomain }: { subdomain: string }) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=scripts&comment=mikhmon-log`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setScripts(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const rows = scripts.map((s) => {
    const parts = (s["name"] || "").split("-|-");
    return { id: s[".id"], date: parts[0] || "-", time: parts[1] || "-", user: parts[2] || "-", address: parts[3] || "-", mac: parts[4] || "-", validity: parts[5] || "-" };
  }).filter((r) => !search || r.user.toLowerCase().includes(search.toLowerCase()));

  if (!loading && scripts.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-white/50">Tidak ada data user log</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari user..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm" />
        <Btn onClick={load} variant="ghost">Refresh</Btn>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Tanggal</th>
              <th className="text-left px-4 py-3">Waktu</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">IP</th>
              <th className="text-left px-4 py-3">MAC</th>
              <th className="text-left px-4 py-3">Validity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : rows.length === 0 ? <Empty cols={6} /> : rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2 text-xs text-white/60">{r.date}</td>
                <td className="px-4 py-2 text-xs text-white/60">{r.time}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.user}</td>
                <td className="px-4 py-2 font-mono text-xs text-white/70">{r.address}</td>
                <td className="px-4 py-2 font-mono text-xs text-white/50">{r.mac}</td>
                <td className="px-4 py-2 text-xs text-white/50">{r.validity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Traffic Monitor ─────────────────────────────────────────────────────────
function TrafficMonitor({ subdomain }: { subdomain: string }) {
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [iface, setIface] = useState("ether1");
  const [history, setHistory] = useState<Array<{ tx: number; rx: number; t: string }>>([]);
  const [current, setCurrent] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/router/data?subdomain=${subdomain}&cmd=interfaces`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setInterfaces(d); });
  }, [subdomain]);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=traffic&iface=${iface}`);
    const d = await res.json();
    if (d["tx-bits-per-second"] !== undefined) {
      setCurrent(d);
      setHistory((h) => [...h.slice(-29), { tx: Number(d["tx-bits-per-second"]) || 0, rx: Number(d["rx-bits-per-second"]) || 0, t: new Date().toLocaleTimeString() }]);
    }
  }, [subdomain, iface]);

  useEffect(() => {
    setHistory([]);
    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  const maxVal = Math.max(...history.flatMap((h) => [h.tx, h.rx]), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={iface} onChange={(e) => setIface(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          {interfaces.map((i) => <option key={i[".id"]} value={i["name"]}>{i["name"]} ({i["type"]})</option>)}
        </select>
        <span className="text-white/30 text-xs">Auto update 3s</span>
      </div>

      {current && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon="⬆️" label="TX" value={fmtBps(current["tx-bits-per-second"])} sub="upload" />
          <StatCard icon="⬇️" label="RX" value={fmtBps(current["rx-bits-per-second"])} sub="download" />
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-white/40 mb-3 flex gap-4">
          <span className="text-blue-400">── TX (Upload)</span>
          <span className="text-green-400">── RX (Download)</span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {history.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full bg-blue-500/60 rounded-t" style={{ height: `${(h.tx / maxVal) * 120}px` }} />
              <div className="w-full bg-green-500/60 rounded-t" style={{ height: `${(h.rx / maxVal) * 120}px` }} />
            </div>
          ))}
          {history.length === 0 && <div className="text-white/20 text-xs w-full text-center">Menunggu data...</div>}
        </div>
      </div>
    </div>
  );
}

// ── DHCP Leases ─────────────────────────────────────────────────────────────
function DhcpLeases({ subdomain }: { subdomain: string }) {
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/router/data?subdomain=${subdomain}&cmd=dhcp`).then((r) => r.json()).then((d) => { setLoading(false); if (Array.isArray(d)) setLeases(d); });
  }, [subdomain]);

  const filtered = leases.filter((l) => !search || l["address"]?.includes(search) || l["mac-address"]?.toLowerCase().includes(search.toLowerCase()) || l["host-name"]?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari IP / MAC / hostname..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 text-sm" />
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">MAC</th>
              <th className="text-left px-4 py-3">Hostname</th>
              <th className="text-left px-4 py-3">Server</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={5} /> : filtered.length === 0 ? <Empty cols={5} /> : filtered.map((l, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-xs">{l["active-address"] || l["address"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/70">{l["active-mac-address"] || l["mac-address"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{l["host-name"] || "-"}</td>
                <td className="px-4 py-2.5 text-xs text-white/50">{l["server"]}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={l["status"] === "bound" ? "green" : "gray"}>{l["status"] || "unknown"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-white/30 text-xs">{filtered.length} lease</p>
    </div>
  );
}

// ── Scheduler ───────────────────────────────────────────────────────────────
function SchedulerPage({ subdomain }: { subdomain: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=scheduler`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setItems(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, id: string) => {
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action, params: { ".id": id } }) });
    load();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-xs">
            <th className="text-left px-4 py-3">Nama</th>
            <th className="text-left px-4 py-3">Start Date</th>
            <th className="text-left px-4 py-3">Interval</th>
            <th className="text-left px-4 py-3">Next Run</th>
            <th className="text-left px-4 py-3">Run Count</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <Loader cols={7} /> : items.length === 0 ? <Empty cols={7} /> : items.map((s) => (
            <tr key={s[".id"]} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-4 py-2.5 text-xs font-semibold">{s["name"]}</td>
              <td className="px-4 py-2.5 text-xs text-white/60">{s["start-date"]} {s["start-time"]}</td>
              <td className="px-4 py-2.5 text-xs text-white/60">{s["interval"] || "-"}</td>
              <td className="px-4 py-2.5 text-xs text-white/50">{s["next-run"] || "-"}</td>
              <td className="px-4 py-2.5 text-xs text-white/50">{s["run-count"] || "0"}</td>
              <td className="px-4 py-2.5"><Badge variant={s["disabled"] === "true" ? "red" : "green"}>{s["disabled"] === "true" ? "Disabled" : "Active"}</Badge></td>
              <td className="px-4 py-2.5">
                <div className="flex gap-1">
                  <Btn size="xs" variant="ghost" onClick={() => doAction(s["disabled"] === "true" ? "enable-scheduler" : "disable-scheduler", s[".id"])}>
                    {s["disabled"] === "true" ? "Enable" : "Disable"}
                  </Btn>
                  <Btn size="xs" variant="danger" onClick={() => confirm("Hapus scheduler ini?") && doAction("remove-scheduler", s[".id"])}>Hapus</Btn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── System ───────────────────────────────────────────────────────────────────
function SystemPage({ subdomain, routerIp }: { subdomain: string; routerIp: string }) {
  const [rebooting, setRebooting] = useState(false);
  const [done, setDone] = useState(false);

  const handleReboot = async () => {
    if (!confirm(`Yakin ingin reboot router ${routerIp}? Semua koneksi akan terputus sementara.`)) return;
    setRebooting(true);
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action: "reboot", params: {} }) });
    setRebooting(false);
    setDone(true);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="font-semibold mb-1">Reboot Router</h3>
        <p className="text-white/40 text-sm mb-4">Merestart router {routerIp}. Semua koneksi hotspot akan terputus sementara.</p>
        {done ? (
          <p className="text-green-400 text-sm">Perintah reboot terkirim. Router sedang restart...</p>
        ) : (
          <button onClick={handleReboot} disabled={rebooting}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition">
            {rebooting ? "Mengirim perintah..." : "Reboot Router"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────────────────────
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

function GaugeCard({ label, value, unit, extra, colorFn }: { label: string; value: number; unit: string; extra?: string; colorFn: (v: number) => string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-white/60">{label}</span>
        <span className="text-sm font-bold">{extra || `${value}${unit}`}</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${colorFn(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, required, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500" />
  );
}

function Btn({ children, onClick, type = "button", disabled, variant = "primary", size = "sm" }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
  variant?: "primary" | "ghost" | "danger" | "warning" | "success"; size?: "xs" | "sm";
}) {
  const base = "rounded-lg font-semibold transition disabled:opacity-50";
  const sizes = { xs: "px-2 py-1 text-xs", sm: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    ghost:   "bg-white/10 hover:bg-white/20 text-white/70",
    danger:  "bg-red-500/20 hover:bg-red-500/40 text-red-400",
    warning: "bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400",
    success: "bg-green-600 hover:bg-green-500 text-white",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>{children}</button>;
}

function Badge({ variant, children }: { variant: "green" | "red" | "blue" | "gray"; children: React.ReactNode }) {
  const colors = { green: "bg-green-500/20 text-green-400", red: "bg-red-500/20 text-red-400", blue: "bg-blue-500/20 text-blue-400", gray: "bg-white/10 text-white/50" };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[variant]}`}>{children}</span>;
}

function Loader({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="text-center py-8 text-white/30 text-sm">Memuat...</td></tr>;
}

function Empty({ cols, text = "Tidak ada data" }: { cols: number; text?: string }) {
  return <tr><td colSpan={cols} className="text-center py-8 text-white/30 text-sm">{text}</td></tr>;
}

function LoadingBox() {
  return <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30">Memuat data router...</div>;
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <p className="text-red-400 mb-3">⚠️ {message}</p>
      {onRetry && <button onClick={onRetry} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition">Coba Lagi</button>}
    </div>
  );
}

function fmtBytes(b: string | undefined): string {
  const n = Number(b || 0);
  if (n > 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n > 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n > 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

function fmtBps(b: string | undefined): string {
  const n = Number(b || 0);
  if (n > 1e9) return (n / 1e9).toFixed(1) + " Gbps";
  if (n > 1e6) return (n / 1e6).toFixed(1) + " Mbps";
  if (n > 1e3) return (n / 1e3).toFixed(1) + " Kbps";
  return n + " bps";
}

// ── Remove Expired Button ───────────────────────────────────────────────────
function RemoveExpiredBtn({ subdomain, onDone }: { subdomain: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handle = async () => {
    if (!confirm("Hapus semua user yang sudah expired?")) return;
    setLoading(true);
    const res = await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action: "remove-expired", params: {} }) });
    const d = await res.json();
    setLoading(false);
    setMsg(`${d.removed || 0} user expired dihapus`);
    setTimeout(() => setMsg(""), 3000);
    onDone();
  };

  return (
    <div className="flex items-center gap-2">
      <Btn variant="warning" disabled={loading} onClick={handle}>{loading ? "Menghapus..." : "Hapus Expired"}</Btn>
      {msg && <span className="text-yellow-400 text-xs">{msg}</span>}
    </div>
  );
}

// ── Quick Print ─────────────────────────────────────────────────────────────
const QP_COLORS = ["bg-blue-600","bg-indigo-600","bg-purple-600","bg-pink-600","bg-red-600","bg-yellow-600","bg-green-600","bg-teal-600","bg-cyan-600","bg-orange-600"];

function QuickPrint({ subdomain, routerName }: { subdomain: string; routerName: string }) {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [activeQp, setActiveQp] = useState<any>(null); // selected package for generate
  const [genQty, setGenQty] = useState(10);
  const [genResult, setGenResult] = useState<Array<{name:string;password:string}>|null>(null);
  const [generating, setGenerating] = useState(false);
  const blank = { name:"", server:"all", usermode:"vc", userlength:"6", prefix:"", chartype:"lower", profile:"", timelimit:"", datalimit:"", comment:"", validity:"", price:"", sprice:"" };
  const [form, setForm] = useState({...blank});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [qp, pr, sv] = await Promise.all([
      fetch(`/api/router/data?subdomain=${subdomain}&cmd=quickprint`).then(r=>r.json()),
      fetch(`/api/router/data?subdomain=${subdomain}&cmd=profiles`).then(r=>r.json()),
      fetch(`/api/router/data?subdomain=${subdomain}&cmd=servers`).then(r=>r.json()),
    ]);
    setLoading(false);
    if (Array.isArray(qp)) setPackages(qp);
    if (Array.isArray(pr)) setProfiles(pr);
    if (Array.isArray(sv)) setServers(sv);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  // Parse quick print script source: #name#server#usermode#userlength#prefix#char#profile#timelimit#datalimit#comment#validity#price_sprice#userlock
  const parseQp = (src: string) => {
    const parts = src.split("#");
    return { name: parts[1]||"", server: parts[2]||"all", usermode: parts[3]||"vc", userlength: parts[4]||"6", prefix: parts[5]||"", chartype: parts[6]||"lower", profile: parts[7]||"", timelimit: parts[8]||"", datalimit: parts[9]||"", comment: parts[10]||"", validity: parts[11]||"", price: (parts[12]||"").split("_")[0], sprice: (parts[12]||"").split("_")[1]||"" };
  };

  const buildSource = (f: typeof blank) =>
    `#${f.name}#${f.server}#${f.usermode}#${f.userlength}#${f.prefix}#${f.chartype}#${f.profile}#${f.timelimit}#${f.datalimit}#${f.comment}#${f.validity}#${f.price}_${f.sprice}#false`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editPkg) {
      await fetch("/api/router/action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subdomain, action:"edit-script", params:{".id": editPkg[".id"], source: buildSource(form)} }) });
    } else {
      await fetch("/api/router/action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subdomain, action:"add-script", params:{name: form.name, source: buildSource(form), comment:"QuickPrintMikhmon"} }) });
    }
    setSaving(false);
    setShowForm(false);
    setEditPkg(null);
    setForm({...blank});
    load();
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Hapus package ini?")) return;
    await fetch("/api/router/action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subdomain, action:"remove-script", params:{".id": id} }) });
    load();
  };

  const handleGenerate = async () => {
    if (!activeQp) return;
    const parsed = parseQp(activeQp.source || "");
    setGenerating(true);
    const res = await fetch("/api/router/batch", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({
      subdomain, qty: genQty, prefix: parsed.prefix, length: Number(parsed.userlength)||6,
      charType: parsed.chartype, mode: parsed.usermode, profile: parsed.profile,
      comment: parsed.comment, server: parsed.server !== "all" ? parsed.server : "",
      limitUptime: parsed.timelimit,
    })});
    const d = await res.json();
    setGenerating(false);
    if (d.users) setGenResult(d.users);
  };

  const handlePrint = (result: Array<{name:string;password:string}>, pkg: any) => {
    const parsed = parseQp(pkg.source || "");
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Voucher ${routerName}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:10px;background:#fff;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .card{border:1px dashed #999;border-radius:8px;padding:10px;page-break-inside:avoid;font-size:11px;}
  .head{font-weight:bold;font-size:12px;text-align:center;background:#1e3a5f;color:#fff;padding:6px;border-radius:4px;margin-bottom:6px;}
  .row{display:flex;justify-content:space-between;margin:2px 0;}
  .lbl{color:#666;} .val{font-weight:bold;font-family:monospace;}
  @media print{body{padding:0;}}
</style></head><body>
<div class="grid">${result.map(u=>`
<div class="card">
  <div class="head">${routerName.toUpperCase()}</div>
  <div class="row"><span class="lbl">User</span><span class="val">${u.name}</span></div>
  ${parsed.usermode !== "vc" ? `<div class="row"><span class="lbl">Pass</span><span class="val">${u.password}</span></div>` : ""}
  ${parsed.validity ? `<div class="row"><span class="lbl">Validity</span><span class="val">${parsed.validity}</span></div>` : ""}
  ${parsed.timelimit ? `<div class="row"><span class="lbl">Time</span><span class="val">${parsed.timelimit}</span></div>` : ""}
  ${parsed.price ? `<div class="row"><span class="lbl">Harga</span><span class="val">Rp ${Number(parsed.price).toLocaleString("id-ID")}</span></div>` : ""}
</div>`).join("")}
</div>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-white/40 text-sm">{packages.length} package</p>
        <Btn onClick={() => { setShowForm(true); setEditPkg(null); setForm({...blank}); }}>+ Tambah Package</Btn>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm">{editPkg ? "Edit Package" : "Package Baru"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nama Package *</label><Input value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Profile</label>
              <select value={form.profile} onChange={e=>setForm(p=>({...p,profile:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="">default</option>
                {profiles.map(p=><option key={p[".id"]} value={p["name"]}>{p["name"]}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Server</label>
              <select value={form.server} onChange={e=>setForm(p=>({...p,server:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="all">Semua Server</option>
                {servers.map((s,i)=><option key={i} value={s["name"]}>{s["name"]}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Mode</label>
              <select value={form.usermode} onChange={e=>setForm(p=>({...p,usermode:e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="vc">Voucher (user=pass)</option>
                <option value="up">Username + Password</option>
              </select>
            </div>
            <div><label className="text-xs text-white/50 mb-1 block">Prefix</label><Input value={form.prefix} onChange={v=>setForm(p=>({...p,prefix:v}))} placeholder="mis: vch-" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Panjang</label><Input value={form.userlength} onChange={v=>setForm(p=>({...p,userlength:v}))} placeholder="6" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Time Limit</label><Input value={form.timelimit} onChange={v=>setForm(p=>({...p,timelimit:v}))} placeholder="1d, 7d, 30d" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Validity</label><Input value={form.validity} onChange={v=>setForm(p=>({...p,validity:v}))} placeholder="30d" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Harga Jual</label><Input value={form.price} onChange={v=>setForm(p=>({...p,price:v}))} placeholder="50000" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Harga Modal</label><Input value={form.sprice} onChange={v=>setForm(p=>({...p,sprice:v}))} placeholder="45000" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Komentar</label><Input value={form.comment} onChange={v=>setForm(p=>({...p,comment:v}))} /></div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditPkg(null); }}>Batal</Btn>
          </div>
        </form>
      )}

      {loading ? <LoadingBox /> : packages.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/40">
          Belum ada Quick Print package. Klik "+ Tambah Package" untuk membuat.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {packages.map((pkg, idx) => {
            const p = parseQp(pkg.source || "");
            const color = QP_COLORS[idx % QP_COLORS.length];
            const isActive = activeQp?.[".id"] === pkg[".id"];
            return (
              <div key={pkg[".id"]} className="space-y-2">
                <div
                  className={`${color} rounded-xl p-4 cursor-pointer transition hover:opacity-90 ${isActive ? "ring-2 ring-white" : ""}`}
                  onClick={() => { setActiveQp(isActive ? null : pkg); setGenResult(null); }}
                >
                  <div className="font-bold text-sm mb-2">{pkg["name"]}</div>
                  <div className="text-white/80 text-xs space-y-0.5">
                    {p.validity   && <div>Validity: {p.validity}</div>}
                    {p.timelimit  && <div>Time: {p.timelimit}</div>}
                    {p.profile    && <div>Profile: {p.profile}</div>}
                    {p.price      && <div>Harga: Rp {Number(p.price).toLocaleString("id-ID")}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Btn size="xs" variant="ghost" onClick={() => { setEditPkg(pkg); setForm({...blank,...p}); setShowForm(true); }}>Edit</Btn>
                  <Btn size="xs" variant="danger" onClick={() => handleRemove(pkg[".id"])}>Hapus</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeQp && (
        <div className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Generate: <span className="text-blue-400">{activeQp["name"]}</span></h3>
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/50">Jumlah:</label>
            <input type="number" min={1} max={500} value={genQty} onChange={e=>setGenQty(Number(e.target.value))}
              className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <Btn disabled={generating} onClick={handleGenerate}>{generating ? "Generating..." : `Generate ${genQty} User`}</Btn>
          </div>
          {genResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-green-400 text-sm">{genResult.length} user dibuat</span>
                <Btn variant="success" onClick={() => handlePrint(genResult, activeQp)}>🖨️ Print Voucher</Btn>
              </div>
              <div className="bg-white/5 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/10 text-white/40"><th className="text-left px-3 py-2">#</th><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Pass</th></tr></thead>
                  <tbody>
                    {genResult.map((u,i)=>(
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-1.5 text-white/30">{i+1}</td>
                        <td className="px-3 py-1.5 font-mono">{u.name}</td>
                        <td className="px-3 py-1.5 font-mono text-white/60">{parseQp(activeQp.source||"").usermode==="vc" ? u.name : u.password}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cookies ─────────────────────────────────────────────────────────────────
function CookiesPage({ subdomain }: { subdomain: string }) {
  const [cookies, setCookies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=cookies`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setCookies(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    await fetch("/api/router/action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subdomain, action:"remove-cookie", params:{".id": id} }) });
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-white/30 text-sm">{cookies.length} cookie aktif</p>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">MAC</th>
              <th className="text-left px-4 py-3">Domain</th>
              <th className="text-left px-4 py-3">Expires In</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={5} /> : cookies.length === 0 ? <Empty cols={5} text="Tidak ada cookie aktif" /> : cookies.map((c) => (
              <tr key={c[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-xs">{c["user"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/70">{c["mac-address"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{c["domain"] || "-"}</td>
                <td className="px-4 py-2.5 text-xs text-white/50">{c["expires-in"]}</td>
                <td className="px-4 py-2.5"><Btn size="xs" variant="danger" onClick={() => remove(c[".id"])}>Hapus</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PPP Secrets ──────────────────────────────────────────────────────────────
function PppSecrets({ subdomain }: { subdomain: string }) {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editS, setEditS] = useState<any>(null);
  const [form, setForm] = useState({ name:"", password:"", profile:"default", "local-address":"", "remote-address":"", comment:"" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=ppp-secrets`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setSecrets(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, params: Record<string,string>) => {
    await fetch("/api/router/action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subdomain, action, params }) });
    load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await doAction("add-ppp-secret", { name: form.name, password: form.password, profile: form.profile, comment: form.comment });
    setSaving(false);
    setShowAdd(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await doAction("edit-ppp-secret", { ".id": editS[".id"], password: editS.password, profile: editS.profile, comment: editS.comment });
    setSaving(false);
    setEditS(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => setShowAdd(true)}>+ Tambah Secret</Btn>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Tambah PPP Secret</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.name}     onChange={v=>setForm(p=>({...p,name:v}))}     placeholder="Username" required />
            <Input value={form.password} onChange={v=>setForm(p=>({...p,password:v}))} placeholder="Password" required />
            <Input value={form.profile}  onChange={v=>setForm(p=>({...p,profile:v}))}  placeholder="Profile (default)" />
            <Input value={form.comment}  onChange={v=>setForm(p=>({...p,comment:v}))}  placeholder="Komentar" />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Batal</Btn>
          </div>
        </form>
      )}

      {editS && (
        <form onSubmit={handleEdit} className="bg-white/5 border border-yellow-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Edit: <span className="text-yellow-400">{editS.name}</span></h3>
          <div className="grid grid-cols-2 gap-3">
            <Input value={editS.password || ""} onChange={v=>setEditS((p:any)=>({...p,password:v}))} placeholder="Password baru" />
            <Input value={editS.profile  || ""} onChange={v=>setEditS((p:any)=>({...p,profile:v}))}  placeholder="Profile" />
            <Input value={editS.comment  || ""} onChange={v=>setEditS((p:any)=>({...p,comment:v}))}  placeholder="Komentar" />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving} variant="warning">{saving ? "Menyimpan..." : "Update"}</Btn>
            <Btn variant="ghost" onClick={() => setEditS(null)}>Batal</Btn>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Username</th>
              <th className="text-left px-4 py-3">Profile</th>
              <th className="text-left px-4 py-3">Service</th>
              <th className="text-left px-4 py-3">Comment</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : secrets.length === 0 ? <Empty cols={6} /> : secrets.map((s) => (
              <tr key={s[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-sm">{s["name"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{s["profile"] || "default"}</td>
                <td className="px-4 py-2.5 text-xs text-white/50">{s["service"] || "any"}</td>
                <td className="px-4 py-2.5 text-xs text-white/40">{s["comment"] || "-"}</td>
                <td className="px-4 py-2.5"><Badge variant={s["disabled"] === "true" ? "red" : "green"}>{s["disabled"] === "true" ? "Disabled" : "Active"}</Badge></td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Btn size="xs" onClick={() => setEditS({...s})}>Edit</Btn>
                    <Btn size="xs" variant="ghost" onClick={() => doAction(s["disabled"]==="true" ? "enable-ppp-secret" : "disable-ppp-secret", {".id": s[".id"]})}>
                      {s["disabled"]==="true" ? "Enable" : "Disable"}
                    </Btn>
                    <Btn size="xs" variant="danger" onClick={() => confirm("Hapus secret ini?") && doAction("remove-ppp-secret", {".id": s[".id"]})}>Hapus</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PPP Active ───────────────────────────────────────────────────────────────
function PppActive({ subdomain }: { subdomain: string }) {
  const [active, setActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=ppp-active`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setActive(d);
  }, [subdomain]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const disconnect = async (id: string) => {
    await fetch("/api/router/action", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subdomain, action:"disconnect-ppp", params:{".id": id} }) });
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-sm">Auto refresh 10s • {active.length} koneksi aktif</p>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Service</th>
              <th className="text-left px-4 py-3">Address</th>
              <th className="text-left px-4 py-3">Uptime</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={5} /> : active.length === 0 ? <Empty cols={5} text="Tidak ada koneksi PPP aktif" /> : active.map((a) => (
              <tr key={a[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-mono text-sm">{a["name"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/60">{a["service"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/70">{a["address"]}</td>
                <td className="px-4 py-2.5 text-xs text-white/50">{a["uptime"]}</td>
                <td className="px-4 py-2.5"><Btn size="xs" variant="danger" onClick={() => disconnect(a[".id"])}>Disconnect</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PPP Profiles ─────────────────────────────────────────────────────────────
function PppProfiles({ subdomain }: { subdomain: string }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editP, setEditP] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const blank = { name: "", "local-address": "", "remote-address": "", "rate-limit": "", "dns-server": "" };
  const [form, setForm] = useState({ ...blank });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/router/data?subdomain=${subdomain}&cmd=ppp-profiles`);
    const d = await res.json();
    setLoading(false);
    if (Array.isArray(d)) setProfiles(d);
  }, [subdomain]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: string, params: Record<string, string>) => {
    setSaving(true);
    await fetch("/api/router/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain, action, params }) });
    setSaving(false);
    load();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = { name: form.name };
    if (form["local-address"])  params["local-address"]  = form["local-address"];
    if (form["remote-address"]) params["remote-address"] = form["remote-address"];
    if (form["rate-limit"])     params["rate-limit"]     = form["rate-limit"];
    if (form["dns-server"])     params["dns-server"]     = form["dns-server"];
    await doAction("add-ppp-profile", params);
    setShowAdd(false);
    setForm({ ...blank });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doAction("edit-ppp-profile", {
      ".id": editP[".id"],
      "local-address":  editP["local-address"]  || "",
      "remote-address": editP["remote-address"] || "",
      "rate-limit":     editP["rate-limit"]     || "",
      "dns-server":     editP["dns-server"]     || "",
    });
    setEditP(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => { setShowAdd(true); setEditP(null); }}>+ Tambah Profile</Btn>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-blue-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Profile Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Nama *</label><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Rate Limit</label><Input value={form["rate-limit"]} onChange={v => setForm(p => ({ ...p, "rate-limit": v }))} placeholder="2M/5M" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Local Address</label><Input value={form["local-address"]} onChange={v => setForm(p => ({ ...p, "local-address": v }))} placeholder="192.168.1.1" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Remote Address</label><Input value={form["remote-address"]} onChange={v => setForm(p => ({ ...p, "remote-address": v }))} placeholder="pool-ppp" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">DNS Server</label><Input value={form["dns-server"]} onChange={v => setForm(p => ({ ...p, "dns-server": v }))} placeholder="8.8.8.8,8.8.4.4" /></div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Batal</Btn>
          </div>
        </form>
      )}

      {editP && (
        <form onSubmit={handleEdit} className="bg-white/5 border border-yellow-500/30 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-sm">Edit: <span className="text-yellow-400">{editP.name}</span></h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/50 mb-1 block">Rate Limit</label><Input value={editP["rate-limit"] || ""} onChange={v => setEditP((p: any) => ({ ...p, "rate-limit": v }))} placeholder="2M/5M" /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Local Address</label><Input value={editP["local-address"] || ""} onChange={v => setEditP((p: any) => ({ ...p, "local-address": v }))} /></div>
            <div><label className="text-xs text-white/50 mb-1 block">Remote Address</label><Input value={editP["remote-address"] || ""} onChange={v => setEditP((p: any) => ({ ...p, "remote-address": v }))} /></div>
            <div><label className="text-xs text-white/50 mb-1 block">DNS Server</label><Input value={editP["dns-server"] || ""} onChange={v => setEditP((p: any) => ({ ...p, "dns-server": v }))} /></div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" disabled={saving} variant="warning">{saving ? "Menyimpan..." : "Update"}</Btn>
            <Btn variant="ghost" onClick={() => setEditP(null)}>Batal</Btn>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs">
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left px-4 py-3">Local Address</th>
              <th className="text-left px-4 py-3">Remote Address</th>
              <th className="text-left px-4 py-3">Rate Limit</th>
              <th className="text-left px-4 py-3">DNS</th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <Loader cols={6} /> : profiles.map((p) => (
              <tr key={p[".id"]} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5 font-semibold">{p["name"]}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/60">{p["local-address"] || "-"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/60">{p["remote-address"] || "-"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/60">{p["rate-limit"] || "-"}</td>
                <td className="px-4 py-2.5 text-xs text-white/50">{p["dns-server"] || "-"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Btn size="xs" onClick={() => { setEditP({ ...p }); setShowAdd(false); }}>Edit</Btn>
                    <Btn size="xs" variant="danger" onClick={() => confirm(`Hapus profile ${p["name"]}?`) && doAction("remove-ppp-profile", { ".id": p[".id"] })}>Hapus</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Script Installer ──────────────────────────────────────────────────────────
function ScriptInstaller({ subdomain }: { subdomain: string }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, { price: string; validity: string }>>({});
  const [installing, setInstalling] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/router/data?subdomain=${subdomain}&cmd=profiles`).then(r => r.json()).then(d => {
      setLoading(false);
      if (Array.isArray(d)) {
        setProfiles(d);
        const init: Record<string, { price: string; validity: string }> = {};
        d.forEach((p: any) => { init[p["name"]] = { price: "", validity: "" }; });
        setPrices(init);
      }
    });
  }, [subdomain]);

  const buildOnLogin = (profileName: string, price: string, validity: string) =>
    `/system script add name=([/system clock get date]."-|-".[/system clock get time]."-|-".$username."-|-"."${price}"."-|-".$address."-|-".$"mac-address"."-|-"."${validity}"."-|-"."${profileName}"."-|-"."mikhmon") comment="mikhmon" source=""`;

  const install = async (p: any) => {
    const cfg = prices[p["name"]] || { price: "0", validity: "" };
    setInstalling(p["name"]);
    const script = buildOnLogin(p["name"], cfg.price || "0", cfg.validity);
    await fetch("/api/router/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, action: "edit-profile", params: { ".id": p[".id"], "on-login": script } }),
    });
    setInstalling(null);
    setDone(prev => ({ ...prev, [p["name"]]: true }));
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4 text-sm text-blue-300 space-y-1">
        <p className="font-semibold">Script Installer — Selling Report</p>
        <p className="text-blue-300/70">Install on-login script ke setiap hotspot profile. Script ini mencatat transaksi ke router setiap kali user login, sehingga Selling Report bisa berjalan.</p>
      </div>

      {loading ? <LoadingBox /> : profiles.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/40">Tidak ada profile ditemukan</div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p[".id"]} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center gap-3">
              <div className="font-semibold text-sm min-w-32">{p["name"]}</div>
              <div className="flex-1 flex flex-wrap gap-2">
                <div>
                  <label className="text-xs text-white/40 block mb-1">Harga (Rp)</label>
                  <input type="number" value={prices[p["name"]]?.price || ""}
                    onChange={e => setPrices(prev => ({ ...prev, [p["name"]]: { ...prev[p["name"]], price: e.target.value } }))}
                    className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="50000" />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">Validity</label>
                  <input type="text" value={prices[p["name"]]?.validity || ""}
                    onChange={e => setPrices(prev => ({ ...prev, [p["name"]]: { ...prev[p["name"]], validity: e.target.value } }))}
                    className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="30d" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                {done[p["name"]] && <span className="text-green-400 text-xs">✓ Terpasang</span>}
                <Btn variant={done[p["name"]] ? "ghost" : "primary"} disabled={installing === p["name"]} onClick={() => install(p)}>
                  {installing === p["name"] ? "Installing..." : done[p["name"]] ? "Reinstall" : "Install Script"}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-white/40 mb-2 font-semibold">Contoh script yang akan dipasang:</p>
        <pre className="text-xs text-white/50 font-mono bg-black/20 rounded p-3 overflow-x-auto whitespace-pre-wrap">
          {buildOnLogin("NAMA_PROFILE", "HARGA", "VALIDITY")}
        </pre>
      </div>
    </div>
  );
}

// ── Router Settings ───────────────────────────────────────────────────────────
function RouterSettings({ subdomain, routerConfig }: { subdomain: string; routerConfig: any }) {
  const [form, setForm] = useState({
    routerIp:    routerConfig.routerIp    || "",
    apiPort:     String(routerConfig.apiPort || 8728),
    routerUser:  routerConfig.routerUser  || "admin",
    routerPass:  "",
    hotspotName: routerConfig.hotspotName || "",
  });
  const [testing, setTesting]   = useState(false);
  const [testOk, setTestOk]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const handleTest = async () => {
    setError(""); setTestOk(null); setTesting(true);
    const res = await fetch("/api/router/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, apiPort: Number(form.apiPort) }),
    });
    const d = await res.json();
    setTesting(false);
    if (!res.ok) setError(d.error || "Gagal terhubung");
    else setTestOk(d.name);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/router/setup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, ...form, apiPort: Number(form.apiPort) }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) setError(d.error || "Gagal menyimpan");
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">✓ Konfigurasi tersimpan</div>}
        {testOk  && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">✓ Terhubung ke: <strong>{testOk}</strong></div>}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-white/50 mb-1 block">IP Router</label>
            <Input value={form.routerIp} onChange={v => { setForm(p => ({ ...p, routerIp: v })); setTestOk(null); }} required />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">API Port</label>
            <Input value={form.apiPort} onChange={v => { setForm(p => ({ ...p, apiPort: v })); setTestOk(null); }} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Username Router</label>
            <Input value={form.routerUser} onChange={v => setForm(p => ({ ...p, routerUser: v }))} required />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Password Baru (kosong = tidak berubah)</label>
            <Input value={form.routerPass} onChange={v => setForm(p => ({ ...p, routerPass: v }))} placeholder="••••••" type="password" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Nama Hotspot (opsional)</label>
          <Input value={form.hotspotName} onChange={v => setForm(p => ({ ...p, hotspotName: v }))} placeholder="hotspot1" />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={handleTest} disabled={testing || !form.routerIp}
            className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-50 rounded-lg text-sm font-semibold transition">
            {testing ? "Testing..." : "Test Koneksi"}
          </button>
          <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Btn>
        </div>
      </form>
    </div>
  );
}

// ── Account Settings ──────────────────────────────────────────────────────────
function AccountSettings({ subdomain, userName, userEmail }: { subdomain: string; userName: string; userEmail: string }) {
  const [name, setName]               = useState(userName);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (newPass && newPass !== confirmPass) { setError("Password baru tidak cocok"); return; }
    if (newPass && newPass.length < 6)     { setError("Password minimal 6 karakter"); return; }
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdomain, name, currentPassword: currentPass || undefined, newPassword: newPass || undefined }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) setError(d.error);
    else { setSuccess("Perubahan tersimpan"); setCurrentPass(""); setNewPass(""); setConfirmPass(""); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2 text-sm">
        <div className="flex gap-2"><span className="text-white/40 w-24">Subdomain</span><span className="font-mono text-blue-400">{subdomain}.mikroplay.com</span></div>
        <div className="flex gap-2"><span className="text-white/40 w-24">Email</span><span>{userEmail}</span></div>
      </div>

      <form onSubmit={handleSave} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-sm">Edit Profil</h3>

        {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3">✓ {success}</div>}

        <div>
          <label className="text-xs text-white/50 mb-1 block">Nama Tampilan</label>
          <Input value={name} onChange={setName} placeholder="Nama Anda" required />
        </div>

        <hr className="border-white/10" />
        <p className="text-xs text-white/40">Ganti Password — kosongkan jika tidak ingin berubah</p>

        <div>
          <label className="text-xs text-white/50 mb-1 block">Password Lama</label>
          <Input value={currentPass} onChange={setCurrentPass} type="password" placeholder="••••••" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Password Baru</label>
            <Input value={newPass} onChange={setNewPass} type="password" placeholder="••••••" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Konfirmasi</label>
            <Input value={confirmPass} onChange={setConfirmPass} type="password" placeholder="••••••" />
          </div>
        </div>

        <Btn type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Btn>
      </form>
    </div>
  );
}
