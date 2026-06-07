export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import RegisterClient from "./RegisterClient";
import PublicConfigWatcher from "@/components/PublicConfigWatcher";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "MikroGent";

export default async function RegisterPage() {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  const showBrandField = config?.showBrandField ?? true;
  const registrationEnabled = config?.registrationEnabled ?? true;

  if (!registrationEnabled) {
    return (
      <>
        <PublicConfigWatcher />
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950 px-4">
          <div className="w-full max-w-sm text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{APP_NAME}</h1>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-sm space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-white/70">Halaman pendaftaran dinonaktifkan.</p>
              <p className="text-xs text-gray-400 dark:text-white/30">Hubungi administrator kalau lo mau dibuatin akun.</p>
              <a href="/masuk" className="inline-block mt-2 text-sm text-blue-500 hover:underline">Ke halaman masuk</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicConfigWatcher />
      <RegisterClient showBrandField={showBrandField} />
    </>
  );
}
