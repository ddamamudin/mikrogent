export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw = Number(body?.seconds);
  if (!Number.isFinite(raw) || raw <= 0) {
    return NextResponse.json({ error: "seconds tidak valid" }, { status: 400 });
  }
  // Clamp ke 1 jam - safety net biar gak ada client kirim angka konyol
  const seconds = Math.min(Math.ceil(raw), 3600);

  const today = getTodayString();
  const userId = session.userId;

  const existing = await prisma.agentDailyCount.findUnique({ where: { userId } });
  const sameDay = existing?.date === today;

  await prisma.agentDailyCount.upsert({
    where: { userId },
    update: {
      voiceSeconds: sameDay ? { increment: seconds } : seconds,
      date: today,
    },
    create: { userId, voiceSeconds: seconds, count: 0, date: today },
  });

  const [config, user] = await Promise.all([
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { dailyVoiceSeconds: true } }),
  ]);
  const limit = user?.dailyVoiceSeconds ?? config?.voiceDailySeconds ?? 180;
  const updated = await prisma.agentDailyCount.findUnique({ where: { userId } });
  const used = updated?.voiceSeconds ?? 0;
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({ ok: true, remainingSeconds: remaining, usedSeconds: used, limitSeconds: limit });
}
