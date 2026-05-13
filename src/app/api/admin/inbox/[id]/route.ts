export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RT } from "@/lib/realtime/events";

// GET /api/admin/inbox/[id] — thread detail. Mark user→admin pesan jadi read.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, brand: true, validated: true, emailVerified: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fromRole: true, fromName: true, body: true, createdAt: true },
      },
    },
  });
  if (!feedback) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  // Mark semua pesan user sebagai read by admin
  const updated = await prisma.feedbackMessage.updateMany({
    where: { feedbackId: id, fromRole: "USER", readByAdmin: false },
    data: { readByAdmin: true },
  });
  if (updated.count > 0) RT.feedbackChanged().catch(() => {});

  return NextResponse.json(feedback);
}
