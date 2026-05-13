export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RT } from "@/lib/realtime/events";

// GET /api/notifications?limit=10&unreadOnly=1
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20")));
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "1";

  const where = {
    userId: session.userId,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.userId, readAt: null } }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

// DELETE /api/notifications — bersihkan SEMUA notif milik user yang login
// (read + unread). Bell jadi kosong total.
export async function DELETE() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.deleteMany({ where: { userId: session.userId } });
  RT.adminNotif(session.userId).catch(() => {});
  return NextResponse.json({ ok: true });
}
