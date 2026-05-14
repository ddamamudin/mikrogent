export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const TITLE_MAX_LEN = 60;

// Auto-derive title dari pesan user pertama: ambil string content, strip whitespace
// berlebih, potong di kata kalau panjang.
function deriveTitle(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const msg = m as { role?: unknown; content?: unknown };
    if (msg.role !== "user") continue;
    let text = "";
    if (typeof msg.content === "string") text = msg.content;
    else if (Array.isArray(msg.content)) {
      // For multimodal: ambil text block pertama
      for (const block of msg.content) {
        if (block && typeof block === "object") {
          const b = block as { type?: string; text?: unknown };
          if (b.type === "text" && typeof b.text === "string") {
            text = b.text;
            break;
          }
        }
      }
    }
    text = text.trim().replace(/\s+/g, " ");
    if (!text) continue;
    if (text.length <= TITLE_MAX_LEN) return text;
    // Cut di word boundary kalau bisa
    const cut = text.slice(0, TITLE_MAX_LEN);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + "...";
  }
  return null;
}

async function authorizeSession(id: string) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return { error: "Unauthorized" as const, status: 401 };
  const target = await prisma.agentChatSession.findUnique({
    where: { id },
    select: { userId: true, title: true },
  });
  if (!target || target.userId !== session.userId) {
    return { error: "Sesi tidak ditemukan" as const, status: 404 };
  }
  return { session, existing: target };
}

// PUT — auto-save messages untuk sesi tertentu. Update title kalau belum ada
// dan messages udah punya minimal 1 pesan user.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeSession(id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const messages = body?.messages;
  const apiMessages = body?.apiMessages;

  const updateData: {
    messages: Prisma.InputJsonValue;
    apiMessages: Prisma.InputJsonValue;
    title?: string;
  } = {
    messages: messages as Prisma.InputJsonValue,
    apiMessages: apiMessages as Prisma.InputJsonValue,
  };
  if (!auth.existing.title) {
    const derived = deriveTitle(messages);
    if (derived) updateData.title = derived;
  }

  await prisma.agentChatSession.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}

// PATCH — partial update untuk metadata (title doang sekarang). Dipakai sama
// fitur "Ganti nama" di sidebar histori.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeSession(id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const rawTitle = body?.title;
  if (typeof rawTitle !== "string") {
    return NextResponse.json({ error: "title wajib string" }, { status: 400 });
  }
  const title = rawTitle.trim().replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
  if (!title) {
    return NextResponse.json({ error: "Judul tidak boleh kosong" }, { status: 400 });
  }

  await prisma.agentChatSession.update({
    where: { id },
    data: { title },
  });

  return NextResponse.json({ ok: true, title });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeSession(id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.agentChatSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
