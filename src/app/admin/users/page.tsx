export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/masuk");

  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { adminLevel: true },
  });
  const level = (admin?.adminLevel as "SUPER" | "ADMIN" | "OPERATOR" | null) ?? "SUPER";
  if (level === "OPERATOR") redirect("/admin/tenant");

  return <UsersClient adminLevel={level} />;
}
