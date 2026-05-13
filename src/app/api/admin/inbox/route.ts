export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET /api/admin/inbox?page=1&status=OPEN
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const statusFilter = sp.get("status") || "";
  const limit = 20;

  const where = {
    ...(statusFilter === "OPEN" || statusFilter === "RESOLVED" ? { status: statusFilter } : {}),
  };

  const [items, total, totalUnread] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, fromRole: true, createdAt: true },
        },
        _count: {
          select: { messages: { where: { fromRole: "USER", readByAdmin: false } } },
        },
      },
    }),
    prisma.feedback.count({ where }),
    prisma.feedbackMessage.count({ where: { fromRole: "USER", readByAdmin: false } }),
  ]);

  return NextResponse.json({
    items: items.map((f) => ({
      id: f.id,
      subject: f.subject,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      user: f.user,
      lastMessage: f.messages[0] ?? null,
      unreadCount: f._count.messages,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    totalUnread,
  });
}
