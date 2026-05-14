export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptSshPass } from "@/lib/crypto";
import RouterClient from "./RouterClient";

export default async function DashboardRouterPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") redirect("/masuk");

  const [user, routers, chatSession] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { maxRouters: true },
    }),
    prisma.mikrotikCredential.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true, apiEnabled: true, apiPort: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Multi-session: ambil activeCredentialId dari sesi most-recent untuk tampilan
    // "Aktif di agent" di Router page.
    prisma.agentChatSession.findFirst({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      select: { activeCredentialId: true },
    }),
  ]);

  const decrypted = routers.map((r) => ({ ...r, sshPass: decryptSshPass(r.sshPass) }));
  return (
    <RouterClient
      initialRouters={decrypted}
      maxRouters={user?.maxRouters ?? 1}
      activeCredentialId={chatSession?.activeCredentialId ?? null}
    />
  );
}
