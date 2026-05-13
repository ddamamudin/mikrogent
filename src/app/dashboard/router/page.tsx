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

  const [user, routers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { maxRouters: true },
    }),
    prisma.mikrotikCredential.findMany({
      where: { userId: session.userId },
      select: { id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return <RouterClient initialRouters={routers} maxRouters={user?.maxRouters ?? 1} />;
}
