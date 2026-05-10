"use client";

import { User, RouterConfig } from "@/generated/prisma/client";
import { useState } from "react";

type Props = {
  user: User;
  routerConfig: RouterConfig;
};

const menuItems = [
  { id: "home", label: "Dashboard", icon: "🏠" },
  { id: "users", label: "Hotspot Users", icon: "👥" },
  { id: "active", label: "User Aktif", icon: "🟢" },
  { id: "profiles", label: "User Profiles", icon: "📋" },
  { id: "voucher", label: "Voucher", icon: "🎟️" },
  { id: "report", label: "Laporan", icon: "📊" },
];

export default function DashboardShell({ user, routerConfig }: Props) {
  const [activeMenu, setActiveMenu] = useState("home");

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 border-r border-white/10 flex flex-col">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-blue-400 font-bold text-lg">Mikroplay</div>
          <div className="text-white/40 text-xs mt-0.5">{user.subdomain}.mikroplay.com</div>
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
          <div className="text-white/60 text-xs">{user.name}</div>
          <div className="text-white/30 text-xs">{user.email}</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">
            {menuItems.find((m) => m.id === activeMenu)?.label}
          </h1>
          <p className="text-white/40 text-sm">Router: {routerConfig.routerIp}</p>
        </div>

        {activeMenu === "home" && <DashboardHome routerIp={routerConfig.routerIp} subdomain={user.subdomain} />}
        {activeMenu !== "home" && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/40">
            Fitur ini sedang dalam pengembangan 🚧
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardHome({ routerIp, subdomain }: { routerIp: string; subdomain: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: "Router IP", value: routerIp, icon: "🌐" },
        { label: "Subdomain", value: `${subdomain}.mikroplay.com`, icon: "🔗" },
        { label: "Status", value: "Terhubung", icon: "✅" },
      ].map((stat) => (
        <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className="text-white/50 text-xs mb-1">{stat.label}</div>
          <div className="font-semibold text-sm">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
