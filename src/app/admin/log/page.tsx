export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import LogClient from "./LogClient";

export default async function AdminLogPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/masuk");
  const { prisma } = await import("@/lib/prisma");
  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { adminLevel: true } });
  if (admin?.adminLevel === "OPERATOR") redirect("/admin/tenant");
  return <LogClient />;
}
