export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PengaturanClient from "./PengaturanClient";

export default async function PengaturanPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/masuk");

  const [config, admin] = await Promise.all([
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, adminLevel: true },
    }),
  ]);
  // Operator gak punya akses Pengaturan.
  if (admin?.adminLevel === "OPERATOR") redirect("/admin/tenant");
  const isSuper = admin?.adminLevel === "SUPER" || admin?.adminLevel == null;

  const defaults = {
    registrationEnabled: true,
    showBrandField: true,
    llmProvider: "openai" as const,
    claudeApiKey: null,
    openaiApiKey: null,
    anthropicModel: "claude-sonnet-4-6",
    openaiModel: "gpt-4o",
    openaiRealtimeModel: "gpt-realtime",
    openaiVoice: "marin",
    agentPersona: null,
    agentKnowledge: null,
    dailyChatLimit: 50,
    voiceCallEnabled: false,
    voiceDailySeconds: 180,
    defaultMaxRouters: 1,
  };

  return (
    <PengaturanClient
      config={config ?? defaults}
      admin={admin ?? { name: "", email: "" }}
      isSuper={isSuper}
    />
  );
}
