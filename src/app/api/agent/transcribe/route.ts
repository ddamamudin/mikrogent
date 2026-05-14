export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB (OpenAI hard limit 25MB)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { validated: true },
  });
  if (!user?.validated) {
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });
  }

  const config = await prisma.appConfig.findUnique({
    where: { id: "singleton" },
    select: { openaiApiKey: true },
  });
  if (!config?.openaiApiKey) {
    return NextResponse.json({ error: "Fitur transcribe belum tersedia (API Key OpenAI belum dikonfigurasi)" }, { status: 503 });
  }

  // Validasi audio file dari multipart form
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return NextResponse.json({ error: "Audio tidak ditemukan" }, { status: 400 });
  if (audio.size === 0) return NextResponse.json({ error: "Audio kosong" }, { status: 400 });
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio terlalu besar (max 20MB)" }, { status: 400 });
  }

  // Optional prompt untuk context — naikkin akurasi term teknis MikroTik
  const ctxPrompt =
    "Pengguna sedang membahas konfigurasi router MikroTik dalam bahasa Indonesia. " +
    "Gunakan istilah teknis dengan benar: RouterOS, DHCP, PPPoE, NAT, firewall, interface ether, " +
    "wireguard, queue, hotspot, mangle, IP address, gateway, bridge, VLAN, IP pool.";

  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "audio.webm");
  upstreamForm.append("model", "gpt-4o-mini-transcribe");
  upstreamForm.append("language", "id");
  upstreamForm.append("prompt", ctxPrompt);
  upstreamForm.append("response_format", "json");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.openaiApiKey}` },
      body: upstreamForm,
    });
  } catch (e) {
    console.error("[transcribe] fetch error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Gagal kontak OpenAI" }, { status: 502 });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    console.error("[transcribe] upstream non-ok:", upstream.status, errText.slice(0, 300));
    return NextResponse.json({ error: `Transkripsi gagal (HTTP ${upstream.status})` }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null) as { text?: string } | null;
  if (!data?.text) {
    return NextResponse.json({ error: "Response transkripsi kosong" }, { status: 502 });
  }
  return NextResponse.json({ text: data.text });
}
