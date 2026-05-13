export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RT } from "@/lib/realtime/events";

// POST /api/notifications/read
// body: { ids?: string[]; all?: boolean }
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const now = new Date();

  if (body.all === true) {
    await prisma.notification.updateMany({
      where: { userId: session.userId, readAt: null },
      data: { readAt: now },
    });
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    const ids = body.ids.filter((x: unknown): x is string => typeof x === "string").slice(0, 100);
    await prisma.notification.updateMany({
      where: { userId: session.userId, id: { in: ids }, readAt: null },
      data: { readAt: now },
    });
  } else {
    return NextResponse.json({ error: "Provide ids[] or all=true" }, { status: 400 });
  }

  RT.adminNotif(session.userId).catch(() => {});
  return NextResponse.json({ ok: true });
}
