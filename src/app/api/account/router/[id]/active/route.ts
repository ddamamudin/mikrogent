export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Set active router untuk chat session - sticky sampai user pilih router lain
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cred = await prisma.mikrotikCredential.findUnique({ where: { id }, select: { userId: true, connected: true } });
  if (!cred || cred.userId !== session.userId) {
    return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  }
  if (!cred.connected) {
    return NextResponse.json({ error: "Router belum terhubung. Verifikasi koneksi dulu." }, { status: 400 });
  }

  // Phase 1 multi-session: set active router di sesi paling baru. Kalau belum
  // ada sesi, bikin baru.
  const recent = await prisma.agentChatSession.findFirst({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (recent) {
    await prisma.agentChatSession.update({
      where: { id: recent.id },
      data: { activeCredentialId: id },
    });
  } else {
    await prisma.agentChatSession.create({
      data: { userId: session.userId, activeCredentialId: id, messages: [], apiMessages: [] },
    });
  }

  return NextResponse.json({ ok: true });
}
