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
    select: { name: true, email: true },
  });

  return (
    <PengaturanClient
      config={config ?? { adminSetupEnabled: true, showBrandField: true, claudeApiKey: null, agentPersona: null, agentKnowledge: null, dailyChatLimit: 50 }}
      admin={admin ?? { name: "", email: "" }}
    />
  );
}
