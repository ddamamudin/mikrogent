export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "../../chat/persona";
import { TOOL_SCHEMAS } from "../../chat/tools";

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
  const baseInstructions = buildSystemPrompt({
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    isConnected: cred?.connected ?? false,
    memory: memory?.content ?? null,
    firstName,
  });

  // Hitung sapaan berdasar jam Jakarta (server zona SEAST = WIB)
  const jakartaHour = parseInt(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }),
    10,
  );
  let timeOfDay = "Malam";
  if (jakartaHour >= 4 && jakartaHour < 11) timeOfDay = "Pagi";
  else if (jakartaHour >= 11 && jakartaHour < 15) timeOfDay = "Siang";
  else if (jakartaHour >= 15 && jakartaHour < 18) timeOfDay = "Sore";

  const instructions = baseInstructions + `

# Mode Voice Call (PENTING)
Kak ${firstName} lagi voice call sama kamu. Aturan khusus:
- Respons HARUS SINGKAT & natural — maksimal 2-3 kalimat per giliran. Jangan baca panjang lebar.
- Pakai bahasa percakapan yang flowy, bukan struktur list/bullet (karena lagi voice, gak ada visual).
- Kalau hasil tool panjang, RINGKAS angka & info pentingnya aja. Tawarin detail lanjut kalau Kakak mau.

# Sapaan Pertama (WAJIB)
Kamu yang nyapa Kak ${firstName} DULUAN, layaknya orang nelpon. Begitu sesi voice ini dimulai (kamu dipanggil pertama kali), langsung ucapkan sapaan kira-kira begini (boleh variasi dikit, tapi inti & urutannya sama):
"Halo Kak ${firstName}, selamat ${timeOfDay}! Ada yang mau ditanyakan, atau Aku perlu ngerjain sesuatu di MikroTik Kakak?"
Setelah itu tunggu Kakak jawab.

# Tutup Panggilan (HATI-HATI)
Tool "end_call" itu cuma dipanggil kalau Kakak JELAS-JELAS pamit / udahan beneran. Contoh trigger yang sah:
- "Daah", "Sampai jumpa", "Bye"
- "Aku udahan dulu", "Aku off dulu", "Tutup aja"
- "Makasih banyak" (sebagai penutup pembicaraan)

JANGAN langsung panggil end_call kalau Kakak cuma bilang:
- "Cukup dulu / sementara cukup ya" — itu bisa berarti jeda sebentar, BUKAN udahan. Tanyakan dulu: "Oke Kak, ${firstName} mau jeda dulu atau emang udahan nih panggilannya?"
- "Oke deh", "Sip", "Mantap" — itu cuma respons setuju, BUKAN ajakan udahan.
- "Stop", "Berhenti" — itu mungkin minta agent stop ngomong, bukan tutup panggilan.

Kalau ragu, KONFIRMASI dulu ke Kakak. Baru panggil end_call setelah Kakak iyain.
`;

  const model = config.openaiRealtimeModel || "gpt-realtime";
  const voice = config.openaiVoice || "marin";

  // Format tool spec untuk Realtime API (sama dengan OpenAI Chat Completions function tools)
  const tools = [
    ...TOOL_SCHEMAS.map((t) => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      parameters: {
        type: "object" as const,
        properties: t.parameters.properties,
        required: t.parameters.required,
      },
    })),
    // Tool khusus voice: nutup panggilan otomatis setelah agent pamit
    {
      type: "function" as const,
      name: "end_call",
      description:
        "Tutup panggilan voice call ini. Panggil HANYA setelah pamit ramah dan yakin Kakak emang udahan.",
      parameters: { type: "object" as const, properties: {}, required: [] },
    },
  ];

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
          tools,
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 600,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice },
          },
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
