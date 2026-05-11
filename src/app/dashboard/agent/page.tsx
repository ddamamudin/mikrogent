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
  const [user, cred, memory, config, dailyCount, chatSession] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    prisma.mikrotikCredential.findUnique({ where: { userId: session.userId } }),
    prisma.agentMemory.findUnique({ where: { userId: session.userId } }),
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.agentDailyCount.findUnique({ where: { userId: session.userId } }),
    prisma.agentChatSession.findUnique({ where: { userId: session.userId } }),
  ]);

  const activeKey = config?.llmProvider === "openai" ? config?.openaiApiKey : config?.claudeApiKey;
  const agentReady = !!activeKey;
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const initialChatCount = dailyCount?.date === today ? (dailyCount.count ?? 0) : 0;

  return (
    <AgentClient
      userId={session.userId}
      firstName={firstName}
      isConnected={cred?.connected ?? false}
      hasMemory={!!memory}
      agentReady={agentReady}
      dailyChatLimit={config?.dailyChatLimit ?? 50}
      initialChatCount={initialChatCount}
      initialMessages={(chatSession?.messages as { role: "user" | "assistant"; content: string }[]) ?? []}
      initialApiMessages={(chatSession?.apiMessages as unknown[]) ?? []}
    />
  );
}
