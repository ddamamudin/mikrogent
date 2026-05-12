export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "../../chat/persona";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;

  const [config, user, cred, memory, dailyCount] = await Promise.all([
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, validated: true, dailyVoiceSeconds: true } }),
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
    prisma.agentMemory.findUnique({ where: { userId } }),
    prisma.agentDailyCount.findUnique({ where: { userId } }),
  ]);

  if (!user?.validated) {
    return NextResponse.json({ error: "Akun belum tervalidasi oleh admin" }, { status: 403 });
  }
  if (!config?.voiceCallEnabled) {
    return NextResponse.json({ error: "Fitur voice call belum diaktifkan" }, { status: 403 });
  }
  if (config.llmProvider !== "openai") {
    return NextResponse.json({ error: "Voice call hanya tersedia saat provider = OpenAI" }, { status: 503 });
  }
  if (!config.openaiApiKey) {
    return NextResponse.json({ error: "API Key OpenAI belum dikonfigurasi" }, { status: 503 });
  }

  const today = getTodayString();
  const limitSeconds = user.dailyVoiceSeconds ?? config.voiceDailySeconds ?? 180;
  const usedToday = dailyCount?.date === today ? (dailyCount.voiceSeconds ?? 0) : 0;
  const remaining = Math.max(0, limitSeconds - usedToday);
  if (remaining <= 0) {
    return NextResponse.json(
      { error: `Batas voice call harian (${limitSeconds} detik) sudah habis. Coba lagi besok.` },
      { status: 429 },
    );
  }

  const firstName = (user.name ?? "").trim().split(/\s+/)[0] || "Kak";
  const instructions = buildSystemPrompt({
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    isConnected: cred?.connected ?? false,
    memory: memory?.content ?? null,
    firstName,
  });

  const model = config.openaiRealtimeModel || "gpt-realtime";

  let mintRes: Response;
  try {
    mintRes = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model,
          instructions,
          audio: { output: { voice: "marin" } },
        },
      }),
    });
  } catch (e) {
    console.error("[voice/session] mint fetch error:", e);
    return NextResponse.json({ error: "Gagal menghubungi OpenAI" }, { status: 502 });
  }

  if (!mintRes.ok) {
    const txt = await mintRes.text().catch(() => "");
    console.error("[voice/session] mint failed:", mintRes.status, txt);
    return NextResponse.json(
      { error: `OpenAI menolak permintaan (HTTP ${mintRes.status})` },
      { status: 502 },
    );
  }

  const mintData = (await mintRes.json().catch(() => null)) as
    | { value?: string; client_secret?: { value?: string } }
    | null;
  const ephemeralKey = mintData?.value ?? mintData?.client_secret?.value;
  if (!ephemeralKey) {
    console.error("[voice/session] no ephemeral key in response:", mintData);
    return NextResponse.json({ error: "Respons OpenAI tidak valid" }, { status: 502 });
  }

  return NextResponse.json({
    ephemeralKey,
    model,
    remainingSeconds: remaining,
    dailyLimitSeconds: limitSeconds,
  });
}
