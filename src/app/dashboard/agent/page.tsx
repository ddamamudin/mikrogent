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

  const [cred, memory, config] = await Promise.all([
    prisma.mikrotikCredential.findUnique({ where: { userId: session.userId } }),
    prisma.agentMemory.findUnique({ where: { userId: session.userId } }),
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const agentReady = !!config?.claudeApiKey;

  return (
    <AgentClient
      userId={session.userId}
      isConnected={cred?.connected ?? false}
      hasMemory={!!memory}
      agentReady={agentReady}
      dailyChatLimit={config?.dailyChatLimit ?? 50}
    />
  );
}
