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
  const today = new Date().toISOString().slice(0, 10);
  const [tenant, dailyCount, config, cred, admin] = await Promise.all([
    prisma.user.findUnique({
      where: { id, role: "USER" },
      select: { id: true, name: true, email: true, brand: true, alamat: true, noWa: true, status: true, emailVerified: true, validated: true, dailyChatLimit: true, createdAt: true, updatedAt: true },
    }),
    prisma.agentDailyCount.findUnique({ where: { userId: id } }),
    prisma.appConfig.findUnique({ where: { id: "singleton" }, select: { dailyChatLimit: true } }),
    prisma.mikrotikCredential.findUnique({ where: { userId: id } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { adminLevel: true } }),
  ]);
  if (!tenant) notFound();

  const globalLimit = config?.dailyChatLimit ?? 50;
  const { dailyChatLimit: userOverride, ...rest } = tenant;
  const isValidator = admin?.adminLevel === "VALIDATOR";
  return (
    <TenantDetailClient
      tenant={{
        ...rest,
        chatCount: dailyCount?.date === today ? (dailyCount.count ?? 0) : 0,
        userDailyChatLimit: userOverride,
        globalDailyChatLimit: globalLimit,
        dailyChatLimit: userOverride ?? globalLimit,
      }}
      mikrotikCred={cred ? { host: cred.host, port: cred.port, sshUser: cred.sshUser, sshPass: cred.sshPass, connected: cred.connected } : null}
      isValidator={isValidator}
    />
  );
}
