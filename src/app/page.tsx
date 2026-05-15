export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getSessionFromCookie } from "@/lib/session";

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  if (session) redirect("/dashboard/agent");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lintasagent-logo-and-text.png"
          alt="LintasAgent"
          className="h-16 w-auto mb-12"
        />
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/masuk"
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3.5 text-center font-medium hover:bg-gray-800 transition text-[15px]"
          >
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="w-full bg-gray-100 text-gray-900 rounded-xl px-4 py-3.5 text-center font-medium hover:bg-gray-200 transition text-[15px]"
          >
            Daftar
          </Link>
        </div>
      </div>
    </div>
  );
}
