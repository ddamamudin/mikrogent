export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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

  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config) {
    return new Response(sseRaw({ type: "error", error: "AI Agent belum dikonfigurasi oleh administrator" }), {
      status: 503, headers: { "Content-Type": "text/event-stream" },
    });
  }

  const provider = config.llmProvider === "openai" ? "openai" : "anthropic";
  const apiKey = provider === "openai" ? config.openaiApiKey : config.claudeApiKey;
  const model = provider === "openai" ? config.openaiModel : config.anthropicModel;
  if (!apiKey) {
    return new Response(
      sseRaw({ type: "error", error: `API key untuk provider ${provider} belum dikonfigurasi oleh administrator` }),
      { status: 503, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const today = getTodayString();
  const dailyCount = await prisma.agentDailyCount.findUnique({ where: { userId } });
  if (dailyCount && dailyCount.date === today && dailyCount.count >= (config.dailyChatLimit ?? 50)) {
    return new Response(
      sseRaw({ type: "error", error: `Batas chat harian (${config.dailyChatLimit}) telah tercapai` }),
      { status: 429, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  type AttachmentIn = { type: "image" | "document"; name: string; data: string; mimeType: string };

  let inputMessages: Anthropic.MessageParam[];
  let attachments: AttachmentIn[] = [];
  try {
    const body = await req.json();
    inputMessages = validateMessages(body?.messages);
    if (Array.isArray(body?.attachments)) {
      attachments = (body.attachments as AttachmentIn[]).slice(0, 10);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request tidak valid";
    return new Response(sseRaw({ type: "error", error: msg }), {
      status: 400, headers: { "Content-Type": "text/event-stream" },
    });
  }

  // Inject attachments into the last user message as content blocks
  if (attachments.length > 0) {
    const last = inputMessages[inputMessages.length - 1];
    if (last?.role === "user") {
      const textContent = typeof last.content === "string" ? last.content : "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks: any[] = [];

      for (const att of attachments) {
        if (att.type === "image") {
          const validImg = ["image/jpeg", "image/png", "image/gif", "image/webp"];
          if (!validImg.includes(att.mimeType)) continue;
          blocks.push({ type: "image", source: { type: "base64", media_type: att.mimeType, data: att.data } });
        } else if (att.mimeType === "application/pdf") {
          // PDF: native document block (Anthropic PDF support)
          blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } });
        } else {
          // Text-based files (txt, html, csv, md): decode and inject as plain text block
          try {
            const decoded = Buffer.from(att.data, "base64").toString("utf-8");
            blocks.push({ type: "text", text: `[File: ${att.name}]\n\n${decoded}` });
          } catch {
            // skip unreadable
          }
        }
      }

      if (textContent) blocks.push({ type: "text", text: textContent });
      inputMessages[inputMessages.length - 1] = { role: "user", content: blocks };
    }
  }

  const [user, cred, memory] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
    prisma.agentMemory.findUnique({ where: { userId } }),
  ]);
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const isConnected = cred?.connected ?? false;

  const runnerOpts = {
    apiKey,
    model,
    inputMessages,
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    isConnected,
    memory: memory?.content ?? null,
    firstName,
    userId,
  };

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

        await prisma.agentDailyCount.upsert({
          where: { userId },
          update: { count: dailyCount?.date === today ? { increment: 1 } : 1, date: today },
          create: { userId, count: 1, date: today },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[agent/chat] stream error:", msg, e);
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
