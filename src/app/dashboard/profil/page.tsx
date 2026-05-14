export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfilTabsClient from "./ProfilTabsClient";

export default async function ProfilPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect("/masuk");

  const today = new Date().toISOString().slice(0, 10);
  const [user, config, dailyCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.agentDailyCount.findUnique({ where: { userId: session.userId } }),
  ]);
  if (!user) redirect("/masuk");

  const chatCount = dailyCount?.date === today ? (dailyCount.count ?? 0) : 0;
  const voiceSecondsUsed = dailyCount?.date === today ? (dailyCount.voiceSeconds ?? 0) : 0;
  const dailyChatLimit = user.dailyChatLimit ?? config?.dailyChatLimit ?? 100;
  const voiceCallEnabled =
    (config?.voiceCallEnabled ?? false) && !!config?.openaiApiKey;
  const voiceDailyLimitSeconds = user.dailyVoiceSeconds ?? config?.voiceDailySeconds ?? 180;

  return (
    <Suspense fallback={null}>
      <ProfilTabsClient
        user={user}
        quota={{
          chatCount,
          dailyChatLimit,
          voiceSecondsUsed,
          voiceDailyLimitSeconds,
          voiceCallEnabled,
        }}
      />
    </Suspense>
  );
}
