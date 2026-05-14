export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/AdminShell";

export type AdminLevel = "SUPER" | "ADMIN" | "OPERATOR";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);

  let adminName: string | undefined;
  let adminEmail: string | undefined;
  let adminLevel: AdminLevel | undefined;
  if (session && session.role === "ADMIN") {
    const u = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, adminLevel: true },
    });
    adminName = u?.name;
    adminEmail = u?.email;
    adminLevel = (u?.adminLevel as AdminLevel | null) ?? "SUPER";
  }

  return (
    <AdminShell session={session} adminName={adminName} adminEmail={adminEmail} adminLevel={adminLevel}>
      {children}
    </AdminShell>
  );
}
