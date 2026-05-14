export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AgentClient from "./AgentClient";

const MAX_SESSIONS_PER_USER = 10;

type ChatSession = {
  id: string;
  title: string | null;
  messages: unknown;
  apiMessages: unknown;
  activeCredentialId: string | null;
};

// Pick session sesuai search param ?session=<id>, fallback ke most-recent.
// Kalau user belum punya sesi sama sekali, bikin yang baru (auto-onboarding
// supaya halaman gak kosong tanpa state).
async function pickOrCreateSession(userId: string, requestedId: string | undefined): Promise<ChatSession> {
  if (requestedId) {
    const found = await prisma.agentChatSession.findUnique({
      where: { id: requestedId },
      select: { id: true, title: true, messages: true, apiMessages: true, activeCredentialId: true, userId: true },
    });
    if (found && found.userId === userId) {
      const { userId: _u, ...rest } = found;
      void _u;
      return rest;
    }
    // Sesi gak valid → fall through ke most-recent
  }
  const recent = await prisma.agentChatSession.findFirst({
    where: { userId },
    select: { id: true, title: true, messages: true, apiMessages: true, activeCredentialId: true },
    orderBy: { updatedAt: "desc" },
  });
  if (recent) return recent;

  // First-time user: bikin sesi kosong supaya halaman ada state
  const created = await prisma.agentChatSession.create({
    data: { userId, messages: [], apiMessages: [] },
    select: { id: true, title: true, messages: true, apiMessages: true, activeCredentialId: true },
  });
  return created;
}

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect("/masuk");

  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  // Fetch user + routers + config + dailyCount + sessions list in parallel.
  // Chat session-nya di-handle terpisah karena tergantung searchParams.session.
  const [user, routers, config, dailyCount, sessionsList] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, dailyChatLimit: true, dailyVoiceSeconds: true } }),
    prisma.mikrotikCredential.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true, host: true, connected: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.agentDailyCount.findUnique({ where: { userId: session.userId } }),
    prisma.agentChatSession.findMany({
      where: { userId: session.userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_SESSIONS_PER_USER,
    }),
  ]);

  const chatSession = await pickOrCreateSession(session.userId, params.session);

  const activeKey = config?.llmProvider === "openai" ? config?.openaiApiKey : config?.claudeApiKey;
  const agentReady = !!activeKey;
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const initialChatCount = dailyCount?.date === today ? (dailyCount.count ?? 0) : 0;
  const initialVoiceSeconds = dailyCount?.date === today ? (dailyCount.voiceSeconds ?? 0) : 0;
  // Voice call selalu lewat OpenAI Realtime — independen dari chat provider.
  // Yang penting voice toggle ON + OpenAI key terisi.
  const voiceCallEnabled =
    (config?.voiceCallEnabled ?? false) &&
    !!config?.openaiApiKey;
  const voiceDailyLimitSeconds = user?.dailyVoiceSeconds ?? config?.voiceDailySeconds ?? 180;
  const connectedRouters = routers.filter((r) => r.connected);
  const hasAnyConnected = connectedRouters.length > 0;
  // Active router = stored sticky di session ini kalau masih valid + connected, atau auto-pick kalau cuma 1
  let activeRouter: { id: string; name: string } | null = null;
  if (chatSession.activeCredentialId) {
    const stored = connectedRouters.find((r) => r.id === chatSession.activeCredentialId);
    if (stored) activeRouter = { id: stored.id, name: stored.name };
  }
  if (!activeRouter && connectedRouters.length === 1) {
    activeRouter = { id: connectedRouters[0].id, name: connectedRouters[0].name };
  }

  // Pastikan sesi aktif ada di sessionsList (kalau auto-created tadi belum sempet masuk)
  const ensureInList = sessionsList.some((s) => s.id === chatSession.id)
    ? sessionsList
    : [{ id: chatSession.id, title: chatSession.title ?? null, updatedAt: new Date() }, ...sessionsList].slice(0, MAX_SESSIONS_PER_USER);

  return (
    <AgentClient
      userId={session.userId}
      sessionId={chatSession.id}
      firstName={firstName}
      hasAnyConnected={hasAnyConnected}
      totalRouters={routers.length}
      connectedRouters={connectedRouters.map((r) => ({ id: r.id, name: r.name }))}
      activeRouter={activeRouter}
      agentReady={agentReady}
      dailyChatLimit={user?.dailyChatLimit ?? config?.dailyChatLimit ?? 100}
      initialChatCount={initialChatCount}
      initialMessages={(chatSession.messages as { role: "user" | "assistant"; content: string }[]) ?? []}
      initialApiMessages={(chatSession.apiMessages as unknown[]) ?? []}
      voiceCallEnabled={voiceCallEnabled}
      voiceDailyLimitSeconds={voiceDailyLimitSeconds}
      initialVoiceSecondsUsed={initialVoiceSeconds}
      sessionsList={ensureInList.map((s) => ({ id: s.id, title: s.title, updatedAt: s.updatedAt.toISOString() }))}
    />
  );
}
