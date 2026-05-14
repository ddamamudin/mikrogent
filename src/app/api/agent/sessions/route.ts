export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_SESSIONS_PER_USER = 20;

async function requireUser() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return { error: "Unauthorized" as const, status: 401 };
  return { session };
}

// GET — list maks N (MAX_SESSIONS_PER_USER) sesi user, sorted by updatedAt desc.
// Return minimal field: id, title, updatedAt. Messages tidak diload (heavy).
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sessions = await prisma.agentChatSession.findMany({
    where: { userId: auth.session.userId },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_SESSIONS_PER_USER,
  });

  return NextResponse.json({ sessions });
}

// POST — bikin sesi baru kosong. Kalau user udah punya >= 10, hapus yang terlama
// (sorted by updatedAt asc). FIFO biar consistent dengan list yang sorted by recency.
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.session.userId;

  // Cleanup oldest kalau udah mentok kuota
  const count = await prisma.agentChatSession.count({ where: { userId } });
  if (count >= MAX_SESSIONS_PER_USER) {
    // Cari oldest by updatedAt (pertama dilist kalau urut asc)
    const oldest = await prisma.agentChatSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: "asc" },
      select: { id: true },
      take: 1,
    });
    if (oldest) await prisma.agentChatSession.delete({ where: { id: oldest.id } });
  }

  const created = await prisma.agentChatSession.create({
    data: { userId, messages: [], apiMessages: [] },
    select: { id: true, title: true, updatedAt: true, createdAt: true },
  });

  return NextResponse.json({ session: created });
}

// DELETE — hapus semua sesi chat user. Dipakai tombol "Bersihkan semua chat"
// di sidebar histori.
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await prisma.agentChatSession.deleteMany({
    where: { userId: auth.session.userId },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
