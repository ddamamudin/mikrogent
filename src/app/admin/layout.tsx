export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  return <AdminShell session={session}>{children}</AdminShell>;
}
