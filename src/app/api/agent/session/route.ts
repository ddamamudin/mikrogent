export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireValidatedUser() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return { error: "Unauthorized" as const, status: 401 };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { validated: true } });
  if (!user?.validated) return { error: "Akun belum tervalidasi oleh admin" as const, status: 403 };
  return { session };
}

export async function PUT(req: NextRequest) {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { messages, apiMessages } = await req.json();

  await prisma.agentChatSession.upsert({
    where: { userId: auth.session.userId },
    update: { messages, apiMessages },
    create: { userId: auth.session.userId, messages, apiMessages },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.agentChatSession.deleteMany({ where: { userId: auth.session.userId } });

  return NextResponse.json({ ok: true });
}
