export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AgentClient from "./AgentClient";

export default async function AgentPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect("/masuk");

  const today = new Date().toISOString().slice(0, 10);
  const [user, routers, config, dailyCount, chatSession] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, dailyChatLimit: true, dailyVoiceSeconds: true } }),
    prisma.mikrotikCredential.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true, host: true, connected: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.agentDailyCount.findUnique({ where: { userId: session.userId } }),
    prisma.agentChatSession.findUnique({ where: { userId: session.userId }, select: { messages: true, apiMessages: true, activeCredentialId: true } }),
  ]);

  const activeKey = config?.llmProvider === "openai" ? config?.openaiApiKey : config?.claudeApiKey;
  const agentReady = !!activeKey;
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const initialChatCount = dailyCount?.date === today ? (dailyCount.count ?? 0) : 0;
  const initialVoiceSeconds = dailyCount?.date === today ? (dailyCount.voiceSeconds ?? 0) : 0;
  const voiceCallEnabled =
    (config?.voiceCallEnabled ?? false) &&
    config?.llmProvider === "openai" &&
    !!config?.openaiApiKey;
  const voiceDailyLimitSeconds = user?.dailyVoiceSeconds ?? config?.voiceDailySeconds ?? 180;
  const connectedRouters = routers.filter((r) => r.connected);
  const hasAnyConnected = connectedRouters.length > 0;
  // Active router = stored sticky kalau masih valid + connected, atau auto-pick kalau cuma 1
  let activeRouter: { id: string; name: string } | null = null;
  if (chatSession?.activeCredentialId) {
    const stored = connectedRouters.find((r) => r.id === chatSession.activeCredentialId);
    if (stored) activeRouter = { id: stored.id, name: stored.name };
  }
  if (!activeRouter && connectedRouters.length === 1) {
    activeRouter = { id: connectedRouters[0].id, name: connectedRouters[0].name };
  }

  return (
    <AgentClient
      userId={session.userId}
      firstName={firstName}
      hasAnyConnected={hasAnyConnected}
      totalRouters={routers.length}
      connectedRouters={connectedRouters.map((r) => ({ id: r.id, name: r.name }))}
      activeRouter={activeRouter}
      agentReady={agentReady}
      dailyChatLimit={user?.dailyChatLimit ?? config?.dailyChatLimit ?? 50}
      initialChatCount={initialChatCount}
      initialMessages={(chatSession?.messages as { role: "user" | "assistant"; content: string }[]) ?? []}
      initialApiMessages={(chatSession?.apiMessages as unknown[]) ?? []}
      voiceCallEnabled={voiceCallEnabled}
      voiceDailyLimitSeconds={voiceDailyLimitSeconds}
      initialVoiceSecondsUsed={initialVoiceSeconds}
    />
  );
}
