export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import TenantDetailClient from "./TenantDetailClient";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/admin/masuk");

  const { id } = await params;
  const tenant = await prisma.user.findUnique({
    where: { id, role: "USER" },
    select: { id: true, name: true, email: true, brand: true, alamat: true, noWa: true, status: true, emailVerified: true, createdAt: true, updatedAt: true },
  });
  if (!tenant) notFound();

  return <TenantDetailClient tenant={tenant} />;
}
