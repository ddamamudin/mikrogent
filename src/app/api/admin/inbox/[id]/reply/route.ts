export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RT } from "@/lib/realtime/events";
import { logAdmin } from "@/lib/admin-log";

// POST /api/admin/inbox/[id]/reply
// body: { body: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true },
  });
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const message = String(body.body ?? "").trim();
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "Isi balasan wajib, max 5000 karakter" }, { status: 400 });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, userId: true, subject: true, status: true },
  });
  if (!feedback) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  await prisma.feedbackMessage.create({
    data: {
      feedbackId: id,
      fromRole: "ADMIN",
      fromId: admin.id,
      fromName: admin.name,
      body: message,
      readByAdmin: true,
      readByUser: false,
    },
  });
  // Reopen kalau sebelumnya RESOLVED — admin balas lagi
  await prisma.feedback.update({
    where: { id },
    data: { updatedAt: new Date(), ...(feedback.status === "RESOLVED" ? { status: "OPEN" } : {}) },
  });

  // Sidebar "Kirim Masukan" user punya badge sendiri (unread admin msg)
  // dan thread auto-update via userFeedbackUpdated — gak perlu bell notif
  RT.feedbackChanged().catch(() => {});
  RT.userFeedbackUpdated(feedback.userId).catch(() => {});

  await logAdmin({
    adminId: admin.id,
    adminName: admin.name,
    action: "feedback_reply",
    details: `${feedback.subject} (id: ${id.slice(0, 8)})`,
  });

  return NextResponse.json({ ok: true });
}
