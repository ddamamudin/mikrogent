export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type TranscriptItem = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const itemsRaw = body?.items;
  if (!Array.isArray(itemsRaw)) {
    return NextResponse.json({ error: "items harus array" }, { status: 400 });
  }
  const items: TranscriptItem[] = itemsRaw
    .filter((x) => x && typeof x === "object" && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .map((x) => ({ role: x.role, content: x.content.trim() }))
    .filter((x) => x.content.length > 0);

  if (items.length === 0) {
    return NextResponse.json({ ok: true, appended: 0 });
  }

  const userId = session.userId;

  // Phase 1 multi-session: voice tetep nge-target sesi paling baru (most-recent
  // updatedAt). Kalau user lagi buka sesi lain di tab terpisah, transcript voice
  // tetep nyangkut ke sesi yang terakhir di-update. Bisa di-tighten ke sessionId
  // explicit nanti kalau perlu.
  const existing = await prisma.agentChatSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // Tandai pesan dari voice supaya kelihatan beda di UI (prefix 🎙️ di UI label)
  const newMessages = items.map((it) => ({ role: it.role, content: it.content, source: "voice" as const }));
  const newApiMessages = items.map((it) => ({ role: it.role, content: it.content }));

  if (existing) {
    const messagesArr = Array.isArray(existing.messages) ? (existing.messages as unknown[]) : [];
    const apiMessagesArr = Array.isArray(existing.apiMessages) ? (existing.apiMessages as unknown[]) : [];
    await prisma.agentChatSession.update({
      where: { id: existing.id },
      data: {
        messages: JSON.parse(JSON.stringify([...messagesArr, ...newMessages])),
        apiMessages: JSON.parse(JSON.stringify([...apiMessagesArr, ...newApiMessages])),
      },
    });
  } else {
    await prisma.agentChatSession.create({
      data: {
        userId,
        messages: JSON.parse(JSON.stringify(newMessages)),
        apiMessages: JSON.parse(JSON.stringify(newApiMessages)),
      },
    });
  }

  return NextResponse.json({ ok: true, appended: items.length });
}
