export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";
import { RT } from "@/lib/realtime/events";

// POST /api/feedback/[id]/message — user kirim pesan lanjutan di thread existing
// body: { body: string }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const message = String(body.body ?? "").trim();
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "Isi pesan wajib, max 5000 karakter" }, { status: 400 });
  }

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, userId: true, subject: true, status: true },
  });
  if (!feedback) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (feedback.userId !== session.userId) return NextResponse.json({ error: "Bukan thread Anda" }, { status: 403 });
  if (feedback.status === "RESOLVED") {
    return NextResponse.json({ error: "Thread sudah ditutup. Buat masukan baru kalau perlu lanjut." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });

  await prisma.feedbackMessage.create({
    data: {
      feedbackId: id,
      fromRole: "USER",
      fromId: session.userId,
      fromName: user?.name ?? "User",
      body: message,
      readByUser: true,
      readByAdmin: false,
    },
  });
  await prisma.feedback.update({ where: { id }, data: { updatedAt: new Date() } });

  notifyAdmins({
    type: "feedback_received",
    title: "Pesan baru di thread masukan",
    body: `${user?.name ?? "Tenant"}: ${feedback.subject}`,
    link: `/admin/inbox/${id}`,
    meta: { feedbackId: id, tenantId: session.userId },
  }).catch(() => {});
  RT.feedbackChanged().catch(() => {});

  return NextResponse.json({ ok: true });
}
