export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { RT } from "@/lib/realtime/events";

// GET /api/feedback — list thread milik user yang login
export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.feedback.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, fromRole: true, createdAt: true, readByUser: true },
      },
      _count: {
        select: { messages: { where: { fromRole: "ADMIN", readByUser: false } } },
      },
    },
  });

  return NextResponse.json({
    items: items.map((f) => ({
      id: f.id,
      subject: f.subject,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      lastMessage: f.messages[0] ?? null,
      unreadCount: f._count.messages,
    })),
  });
}

// POST /api/feedback — bikin thread baru
// body: { subject: string; body: string }
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject ?? "").trim();
  const message = String(body.body ?? "").trim();
  if (!subject || subject.length > 200) {
    return NextResponse.json({ error: "Judul wajib, max 200 karakter" }, { status: 400 });
  }
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "Isi pesan wajib, max 5000 karakter" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const feedback = await prisma.feedback.create({
    data: {
      userId: user.id,
      subject,
      status: "OPEN",
      messages: {
        create: {
          fromRole: "USER",
          fromId: user.id,
          fromName: user.name,
          body: message,
          readByUser: true,
          readByAdmin: false,
        },
      },
    },
    select: { id: true },
  });

  notifyAdmins({
    type: "feedback_received",
    title: "Masukan baru dari tenant",
    body: `${user.name}: ${subject}`,
    link: `/admin/inbox/${feedback.id}`,
    meta: { feedbackId: feedback.id, tenantId: user.id },
  }).catch(() => {});
  RT.feedbackChanged().catch(() => {});

  return NextResponse.json({ ok: true, id: feedback.id });
}
