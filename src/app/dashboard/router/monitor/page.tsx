export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MonitorClient from "./MonitorClient";

export default async function MonitorPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") redirect("/masuk");

  const routers = await prisma.mikrotikCredential.findMany({
    where: { userId: session.userId },
    select: { id: true, name: true, host: true, apiEnabled: true, apiPort: true, connected: true },
    orderBy: { createdAt: "asc" },
  });

  return <MonitorClient initialRouters={routers} />;
}
