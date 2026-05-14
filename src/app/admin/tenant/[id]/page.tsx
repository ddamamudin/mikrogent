export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptSshPass } from "@/lib/crypto";
import TenantDetailClient from "./TenantDetailClient";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/admin/masuk");

  const { id } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const [tenant, dailyCount, config, creds] = await Promise.all([
    prisma.user.findUnique({
      where: { id, role: "USER" },
      select: { id: true, name: true, email: true, brand: true, alamat: true, noWa: true, status: true, emailVerified: true, validated: true, dailyChatLimit: true, dailyVoiceSeconds: true, maxRouters: true, createdAt: true, updatedAt: true },
    }),
    prisma.agentDailyCount.findUnique({ where: { userId: id } }),
    prisma.appConfig.findUnique({ where: { id: "singleton" }, select: { dailyChatLimit: true, voiceDailySeconds: true, voiceCallEnabled: true } }),
    prisma.mikrotikCredential.findMany({
      where: { userId: id },
      select: { id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!tenant) notFound();

  const globalLimit = config?.dailyChatLimit ?? 50;
  const globalVoiceLimit = config?.voiceDailySeconds ?? 180;
  const { dailyChatLimit: userOverride, dailyVoiceSeconds: userVoiceOverride, ...rest } = tenant;
  const sameDay = dailyCount?.date === today;
  return (
    <TenantDetailClient
      tenant={{
        ...rest,
        chatCount: sameDay ? (dailyCount.count ?? 0) : 0,
        userDailyChatLimit: userOverride,
        globalDailyChatLimit: globalLimit,
        dailyChatLimit: userOverride ?? globalLimit,
        voiceSecondsUsed: sameDay ? (dailyCount.voiceSeconds ?? 0) : 0,
        userDailyVoiceSeconds: userVoiceOverride,
        globalDailyVoiceSeconds: globalVoiceLimit,
        dailyVoiceSeconds: userVoiceOverride ?? globalVoiceLimit,
        voiceCallEnabled: config?.voiceCallEnabled ?? false,
      }}
      mikrotikCreds={creds.map((c) => ({ ...c, sshPass: decryptSshPass(c.sshPass) }))}
    />
  );
}
