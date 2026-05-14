export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Operator gak boleh akses log sama sekali.
  const viewer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { adminLevel: true },
  });
  const viewerLevel = (viewer?.adminLevel as "SUPER" | "ADMIN" | "OPERATOR" | null) ?? "SUPER";
  if (viewerLevel === "OPERATOR")
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const action = searchParams.get("action") || "";
  const limit = 50;

  // Admin gak boleh lihat aktivitas superadmin — filter adminId yang adminLevel=SUPER.
  let hiddenAdminIds: string[] = [];
  if (viewerLevel === "ADMIN") {
    const supers = await prisma.user.findMany({
      where: { role: "ADMIN", adminLevel: "SUPER" },
      select: { id: true },
    });
    hiddenAdminIds = supers.map((u) => u.id);
  }

  const where: Prisma.AdminLogWhereInput = {};
  if (action) where.action = action;
  if (hiddenAdminIds.length > 0) where.adminId = { notIn: hiddenAdminIds };

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminLog.count({ where }),
  ]);

  const actions = await prisma.adminLog.findMany({
    where: hiddenAdminIds.length > 0 ? { adminId: { notIn: hiddenAdminIds } } : undefined,
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    availableActions: actions.map((a) => a.action),
  });
}
