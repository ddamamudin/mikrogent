import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mikroplay";
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

export default async function BrandSitePage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const user = await prisma.user.findUnique({
    where: { brand },
    select: { name: true, brand: true, alamat: true, noWa: true },
  });

  if (!user) return notFound();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-400 dark:text-white/40 text-sm mt-1">{user.brand}.{APP_DOMAIN}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 p-6 space-y-4 shadow-sm">
          {user.alamat && (
            <div className="flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40 mt-0.5 shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-gray-600 dark:text-white/70 text-sm">{user.alamat}</p>
            </div>
          )}

          {user.noWa && (
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-white/40 shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.47a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <a
                href={`https://wa.me/${user.noWa.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {user.noWa}
              </a>
            </div>
          )}

          {!user.alamat && !user.noWa && (
            <p className="text-gray-400 dark:text-white/30 text-sm text-center">Belum ada info kontak.</p>
          )}
        </div>

        <p className="text-center text-gray-300 dark:text-white/20 text-xs mt-8">
          Powered by {APP_NAME}
        </p>
      </div>
    </main>
  );
}
