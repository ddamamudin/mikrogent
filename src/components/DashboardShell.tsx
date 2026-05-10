"use client";

import { User, RouterConfig } from "@/generated/prisma/client";

type Props = { user: User; routerConfig: RouterConfig };

export default function DashboardShell({ user, routerConfig }: Props) {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
    window.location.href = `${window.location.protocol}//${appDomain}/login`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="text-blue-400 font-bold text-lg">Mikroplay</div>
        <button
          onClick={handleLogout}
          className="px-4 py-1.5 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          Keluar
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl border border-white/10 p-8 w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-white/40 text-sm mt-1">{user.email}</p>
            <p className="text-white/30 text-xs mt-1">{user.subdomain}.mikroplay.com</p>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Router</span>
              <span className="text-white/80">{routerConfig.routerIp}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Subdomain</span>
              <span className="text-white/80">{user.subdomain}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
