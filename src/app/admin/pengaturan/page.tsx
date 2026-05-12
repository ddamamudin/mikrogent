export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PengaturanClient from "./PengaturanClient";

export default async function PengaturanPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/admin/masuk");

  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, adminLevel: true },
  });
  if (admin?.adminLevel === "VALIDATOR") redirect("/admin/tenant");

  const defaults = {
    adminSetupEnabled: true,
    showBrandField: true,
    llmProvider: "anthropic" as const,
    claudeApiKey: null,
    openaiApiKey: null,
    anthropicModel: "claude-sonnet-4-6",
    openaiModel: "gpt-4o",
    openaiRealtimeModel: "gpt-realtime",
    agentPersona: null,
    agentKnowledge: null,
    dailyChatLimit: 50,
    voiceCallEnabled: false,
    voiceDailySeconds: 180,
  };

  return (
    <PengaturanClient
      config={config ?? defaults}
      admin={admin ?? { name: "", email: "" }}
    />
  );
}
