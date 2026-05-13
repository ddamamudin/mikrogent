export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET /api/feedback/[id] — detail thread milik user, mark admin messages sebagai read
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fromRole: true, fromName: true, body: true, createdAt: true },
      },
    },
  });
  if (!feedback) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (feedback.userId !== session.userId) return NextResponse.json({ error: "Bukan thread Anda" }, { status: 403 });

  // Mark semua pesan admin sebagai read by user
  await prisma.feedbackMessage.updateMany({
    where: { feedbackId: id, fromRole: "ADMIN", readByUser: false },
    data: { readByUser: true },
  });

  return NextResponse.json({
    id: feedback.id,
    subject: feedback.subject,
    status: feedback.status,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    messages: feedback.messages,
  });
}
