export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import TenantListClient from "./TenantListClient";

export default async function TenantPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/masuk");

  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { adminLevel: true },
  });
  const level = (admin?.adminLevel as "SUPER" | "ADMIN" | "OPERATOR" | null) ?? "SUPER";

  return <TenantListClient adminLevel={level} />;
}
