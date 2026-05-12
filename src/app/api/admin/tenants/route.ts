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
        id: true, name: true, email: true, brand: true, status: true, emailVerified: true, validated: true, dailyChatLimit: true, createdAt: true,
        agentDailyCount: { select: { count: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
    prisma.appConfig.findUnique({ where: { id: "singleton" }, select: { dailyChatLimit: true } }),
  ]);

  const dailyChatLimit = config?.dailyChatLimit ?? 50;
  const tenantsWithCount = tenants.map((t) => {
    const { dailyChatLimit: userOverride, agentDailyCount, ...rest } = t;
    return {
      ...rest,
      chatCount: agentDailyCount?.date === today ? (agentDailyCount.count ?? 0) : 0,
      userDailyChatLimit: userOverride,
      effectiveLimit: userOverride ?? dailyChatLimit,
    };
  });

  return NextResponse.json({ tenants: tenantsWithCount, total, page, totalPages: Math.ceil(total / limit), dailyChatLimit });
}
