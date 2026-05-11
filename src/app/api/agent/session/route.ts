export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return null;
  return session;
}

export async function PUT(req: NextRequest) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, apiMessages } = await req.json();

  await prisma.agentChatSession.upsert({
    where: { userId: session.userId },
    update: { messages, apiMessages },
    create: { userId: session.userId, messages, apiMessages },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.agentChatSession.deleteMany({ where: { userId: session.userId } });

  return NextResponse.json({ ok: true });
}
