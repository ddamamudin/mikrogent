export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import RouterClient from "./RouterClient";

export default async function DashboardRouterPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") redirect("/masuk");

  const cred = await prisma.mikrotikCredential.findUnique({
    where: { userId: session.userId },
    select: { host: true, sshUser: true, sshPass: true, connected: true, updatedAt: true },
  });

  return <RouterClient initial={cred ? {
    host: cred.host, sshUser: cred.sshUser, sshPass: cred.sshPass, connected: cred.connected,
  } : null} />;
}
