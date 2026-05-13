export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { RT } from "@/lib/realtime/events";
import type Anthropic from "@anthropic-ai/sdk";
import { runAnthropic, type SseEvent } from "./anthropic-runner";
import { runOpenAI } from "./openai-runner";

const enc = new TextEncoder();
const sse = (data: SseEvent) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);
const sseRaw = (data: object) => `data: ${JSON.stringify(data)}\n\n`;

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateMessages(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) throw new Error("messages harus array");
  if (raw.length === 0) throw new Error("messages tidak boleh kosong");
  if (raw.length > 50) throw new Error("Riwayat percakapan sudah mencapai 50 pesan. Mulai chat baru untuk melanjutkan.");
  const out: Anthropic.MessageParam[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") throw new Error("Format pesan tidak valid");
    const msg = m as { role?: unknown; content?: unknown };
    if (msg.role !== "user" && msg.role !== "assistant") {
      throw new Error("Role pesan tidak valid");
    }
    if (typeof msg.content !== "string" && !Array.isArray(msg.content)) {
      throw new Error("Format content tidak valid");
    }
    out.push(msg as Anthropic.MessageParam);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return new Response(sseRaw({ type: "error", error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "text/event-stream" },
    });
  }
  const userId = session.userId;

  // Burst rate limit per-user: cegah retry loop / client bug bikin biaya LLM meledak.
  // 20 request / 60 detik — jauh di atas pemakaian normal user, tapi nge-block storm.
  // Pakai userId sebagai identifier (rateLimit treat string apa pun sebagai opaque key).
  const burst = await rateLimit({ key: "chat-burst", ip: `user:${userId}`, limit: 20, windowMs: 60_000 });
  if (!burst.ok) {
    const retrySec = Math.ceil(burst.resetIn / 1000);
    return new Response(
      sseRaw({ type: "error", error: `Terlalu banyak request. Coba lagi dalam ${retrySec} detik.` }),
      {
        status: 429,
        headers: { "Content-Type": "text/event-stream", "Retry-After": String(retrySec) },
      },
    );
  }

  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { validated: true, dailyChatLimit: true } });
  if (!userRecord?.validated) {
    return new Response(sseRaw({ type: "error", error: "Akun belum tervalidasi oleh admin" }), {
      status: 403, headers: { "Content-Type": "text/event-stream" },
    });
  }

  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config) {
    return new Response(sseRaw({ type: "error", error: "AI Agent belum dikonfigurasi oleh administrator" }), {
      status: 503, headers: { "Content-Type": "text/event-stream" },
    });
  }

  const provider = config.llmProvider === "anthropic" ? "anthropic" : "openai";
  const apiKey = provider === "openai" ? config.openaiApiKey : config.claudeApiKey;
  const model = provider === "openai" ? config.openaiModel : config.anthropicModel;
  if (!apiKey) {
    return new Response(
      sseRaw({ type: "error", error: `API key untuk provider ${provider} belum dikonfigurasi oleh administrator` }),
      { status: 503, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const today = getTodayString();
  const effectiveLimit = userRecord.dailyChatLimit ?? config.dailyChatLimit ?? 50;

  type AttachmentIn = { name: string; data: string; mimeType: string };

  let inputMessages: Anthropic.MessageParam[];
  let attachments: AttachmentIn[] = [];
  try {
    const body = await req.json();
    inputMessages = validateMessages(body?.messages);
    if (Array.isArray(body?.attachments)) {
      attachments = (body.attachments as AttachmentIn[]).slice(0, 5);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request tidak valid";
    return new Response(sseRaw({ type: "error", error: msg }), {
      status: 400, headers: { "Content-Type": "text/event-stream" },
    });
  }

  // Inject image attachments into the last user message as content blocks
  if (attachments.length > 0) {
    const last = inputMessages[inputMessages.length - 1];
    if (last?.role === "user") {
      const textContent = typeof last.content === "string" ? last.content : "";
      const validImg = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks: any[] = [];

      for (const att of attachments) {
        if (!validImg.includes(att.mimeType)) continue;
        blocks.push({ type: "image", source: { type: "base64", media_type: att.mimeType, data: att.data } });
      }

      if (textContent) blocks.push({ type: "text", text: textContent });
      if (blocks.length > 0) {
        inputMessages[inputMessages.length - 1] = { role: "user", content: blocks };
      }
    }
  }

  const [user, routers, chatSession] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.mikrotikCredential.findMany({
      where: { userId },
      select: { id: true, name: true, host: true, connected: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentChatSession.findUnique({
      where: { userId },
      select: { activeCredentialId: true },
    }),
  ]);
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const connectedRouters = routers.filter((r) => r.connected);

  if (connectedRouters.length === 0) {
    return new Response(
      sseRaw({
        type: "error",
        error: routers.length === 0
          ? "Belum ada router yang Kakak tambahkan. Tambah dulu di menu Router di sidebar yaa."
          : "Belum ada router yang terhubung. Cek lagi data router di menu Router (pastikan SSH aktif, port match, kredensial benar).",
      }),
      { status: 403, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  // Resolve active router: kalau session simpan activeCredentialId dan masih valid (router masih ada + connected), pakai itu.
  // Kalau cuma 1 router connected, auto-pick. Kalau >1 dan belum ada, biarkan null - agent akan tanya user.
  let activeCredentialId: string | null = null;
  if (chatSession?.activeCredentialId) {
    const stillValid = connectedRouters.find((r) => r.id === chatSession.activeCredentialId);
    if (stillValid) activeCredentialId = stillValid.id;
  }
  if (!activeCredentialId && connectedRouters.length === 1) {
    activeCredentialId = connectedRouters[0].id;
    // Persist auto-pick supaya next request konsisten
    await prisma.agentChatSession.upsert({
      where: { userId },
      update: { activeCredentialId },
      create: { userId, activeCredentialId, messages: [], apiMessages: [] },
    });
  }

  // Load memory dari router aktif (kalau ada)
  const memory = activeCredentialId
    ? await prisma.agentMemory.findUnique({ where: { credentialId: activeCredentialId } })
    : null;

  const runnerOpts = {
    apiKey,
    model,
    inputMessages,
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    memory: memory?.content ?? null,
    firstName,
    userId,
    routers: connectedRouters.map((r) => ({ id: r.id, name: r.name, host: r.host })),
    activeCredentialId,
  };

  // Atomic reserve: increment count by 1 (or reset to 1 kalau date beda) HANYA kalau belum lewat limit.
  // Pakai INSERT ... ON CONFLICT DO UPDATE WHERE supaya race-safe — concurrent request gak bisa bypass limit.
  // Kalau runner gagal, kita decrement balik di catch block biar failed run gak charge user.
  const reserved = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "AgentDailyCount" ("id", "userId", "date", "count", "voiceSeconds")
    VALUES (${randomUUID()}, ${userId}, ${today}, 1, 0)
    ON CONFLICT ("userId") DO UPDATE
    SET
      "count" = CASE WHEN "AgentDailyCount"."date" = EXCLUDED."date" THEN "AgentDailyCount"."count" + 1 ELSE 1 END,
      "date" = EXCLUDED."date"
    WHERE
      "AgentDailyCount"."date" <> EXCLUDED."date"
      OR "AgentDailyCount"."count" < ${effectiveLimit}
    RETURNING "count"
  `;
  if (reserved.length === 0) {
    return new Response(
      sseRaw({ type: "error", error: `Batas chat harian (${effectiveLimit}) telah tercapai` }),
      { status: 429, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  // Push update kuota ke admin list (kolom "Kuota Hari Ini")
  RT.tenantUpserted(userId).catch(() => {});

  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => {
        try { controller.enqueue(enc.encode(": ping\n\n")); } catch {}
      }, 15000);

      const emit = (evt: SseEvent) => {
        try { controller.enqueue(sse(evt)); } catch {}
      };

      try {
        if (provider === "openai") {
          await runOpenAI({ ...runnerOpts, emit });
        } else {
          await runAnthropic({ ...runnerOpts, emit });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[agent/chat] stream error:", msg, e);
        // Rollback reservasi — runner gagal, jangan charge user
        try {
          await prisma.agentDailyCount.updateMany({
            where: { userId, date: today, count: { gt: 0 } },
            data: { count: { decrement: 1 } },
          });
        } catch (rollbackErr) {
          console.error("[agent/chat] rollback decrement gagal:", rollbackErr);
        }
        emit({ type: "error", error: msg });
      } finally {
        clearInterval(ping);
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
