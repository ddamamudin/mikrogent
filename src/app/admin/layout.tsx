export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);

  let adminLevel: "SUPER" | "VALIDATOR" | null = null;
  if (session && session.role === "ADMIN") {
    const u = await prisma.user.findUnique({ where: { id: session.userId }, select: { adminLevel: true } });
    adminLevel = (u?.adminLevel as "SUPER" | "VALIDATOR" | null) ?? "SUPER";
  }

  // Halaman setup dan masuk tidak butuh auth
  return <AdminShell session={session} adminLevel={adminLevel}>{children}</AdminShell>;
}
