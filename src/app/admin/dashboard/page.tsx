export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/admin/masuk");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = now.toISOString().slice(0, 10);

  const [
    total,
    active,
    suspended,
    pending,
    newThisMonth,
    chatTodayAgg,
    routerTotal,
    routerConnected,
    feedbackOpen,
    recentTenants,
    recentLogs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "USER", status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: "USER", validated: false } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: startOfMonth } } }),
    prisma.agentDailyCount.aggregate({
      where: { date: today },
      _sum: { count: true, voiceSeconds: true },
    }),
    prisma.mikrotikCredential.count(),
    prisma.mikrotikCredential.count({ where: { connected: true } }),
    prisma.feedback.count({ where: { status: "OPEN" } }),
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        brand: true,
        validated: true,
        emailVerified: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, adminName: true, action: true, details: true, createdAt: true },
    }),
  ]);

  const stats = {
    total,
    active,
    suspended,
    pending,
    newThisMonth,
    chatToday: chatTodayAgg._sum.count ?? 0,
    voiceTodaySeconds: chatTodayAgg._sum.voiceSeconds ?? 0,
    routerTotal,
    routerConnected,
    feedbackOpen,
  };

  return (
    <AdminDashboardClient
      stats={stats}
      recentTenants={recentTenants.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }))}
      recentLogs={recentLogs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
    />
  );
}
