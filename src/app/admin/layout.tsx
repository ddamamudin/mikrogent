export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);

  let adminName: string | undefined;
  let adminEmail: string | undefined;
  if (session && session.role === "ADMIN") {
    const u = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    });
    adminName = u?.name;
    adminEmail = u?.email;
  }

  return (
    <AdminShell session={session} adminName={adminName} adminEmail={adminEmail}>
      {children}
    </AdminShell>
  );
}
