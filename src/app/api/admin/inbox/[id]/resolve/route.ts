export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import { RT } from "@/lib/realtime/events";
import { logAdmin } from "@/lib/admin-log";

// POST /api/admin/inbox/[id]/resolve
// body: { status: "OPEN" | "RESOLVED" }
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
  const status = body.status === "OPEN" || body.status === "RESOLVED" ? body.status : null;
  if (!status) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, userId: true, subject: true, status: true },
  });
  if (!feedback) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (feedback.status === status) return NextResponse.json({ ok: true });

  await prisma.feedback.update({ where: { id }, data: { status } });

  if (status === "RESOLVED") {
    notifyUser(feedback.userId, {
      type: "feedback_resolved",
      title: "Masukan ditutup oleh admin",
      body: feedback.subject,
      link: `/dashboard/masukan/${id}`,
      meta: { feedbackId: id },
    }).catch(() => {});
  }
  RT.feedbackChanged().catch(() => {});
  RT.userFeedbackUpdated(feedback.userId).catch(() => {});

  await logAdmin({
    adminId: admin.id,
    adminName: admin.name,
    action: status === "RESOLVED" ? "feedback_resolve" : "feedback_reopen",
    details: `${feedback.subject} (id: ${id.slice(0, 8)})`,
  });

  return NextResponse.json({ ok: true });
}
