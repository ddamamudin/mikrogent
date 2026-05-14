export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;

  const where = {
    role: "USER" as const,
    ...(status === "ACTIVE" || status === "SUSPENDED" ? { status: status as "ACTIVE" | "SUSPENDED" } : {}),
    ...(status === "PENDING" ? { validated: false } : {}),
    ...(status === "VALIDATED" ? { validated: true } : {}),
    ...(status === "ROUTER_CONNECTED" ? { mikrotikCredentials: { some: { connected: true } } } : {}),
    ...(status === "ROUTER_DISCONNECTED" ? { mikrotikCredentials: { some: { connected: false } }, NOT: { mikrotikCredentials: { some: { connected: true } } } } : {}),
    ...(status === "ROUTER_NONE" ? { mikrotikCredentials: { none: {} } } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { brand: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const today = new Date().toISOString().slice(0, 10);
  const [tenants, total, config] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, brand: true, status: true, emailVerified: true, validated: true, dailyChatLimit: true, dailyVoiceSeconds: true, maxRouters: true, createdAt: true,
        agentDailyCount: { select: { count: true, voiceSeconds: true, date: true } },
        mikrotikCredentials: { select: { connected: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.appConfig.findUnique({ where: { id: "singleton" }, select: { dailyChatLimit: true, voiceDailySeconds: true, voiceCallEnabled: true } }),
  ]);

  const dailyChatLimit = config?.dailyChatLimit ?? 100;
  const voiceDailySeconds = config?.voiceDailySeconds ?? 180;
  const voiceCallEnabled = config?.voiceCallEnabled ?? false;
  const tenantsWithCount = tenants.map((t) => {
    const { dailyChatLimit: userOverride, dailyVoiceSeconds: userVoiceOverride, agentDailyCount, mikrotikCredentials, ...rest } = t;
    // Status agregat: connected kalau minimal 1 router up; none kalau gak ada router sama sekali
    const total = mikrotikCredentials.length;
    const connected = mikrotikCredentials.filter((c) => c.connected).length;
    const mikrotikStatus: "connected" | "disconnected" | "none" =
      total === 0 ? "none" : connected > 0 ? "connected" : "disconnected";
    const sameDay = agentDailyCount?.date === today;
    return {
      ...rest,
      chatCount: sameDay ? (agentDailyCount.count ?? 0) : 0,
      userDailyChatLimit: userOverride,
      effectiveLimit: userOverride ?? dailyChatLimit,
      voiceSecondsUsed: sameDay ? (agentDailyCount.voiceSeconds ?? 0) : 0,
      userDailyVoiceSeconds: userVoiceOverride,
      effectiveVoiceLimit: userVoiceOverride ?? voiceDailySeconds,
      mikrotikStatus,
      routerCount: total,
      routersConnected: connected,
    };
  });

  return NextResponse.json({ tenants: tenantsWithCount, total, page, totalPages: Math.ceil(total / limit), dailyChatLimit, voiceDailySeconds, voiceCallEnabled });
}
