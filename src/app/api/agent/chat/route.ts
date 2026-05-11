export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { executeMikrotikCommand, scanMikrotikConfig, MikrotikConfig } from "@/lib/mikrotik";
import crypto from "crypto";

const AGENT_SSH_USER = "replay-agent";
const MODEL = "claude-sonnet-4-6";
const enc = new TextEncoder();

function sse(data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function buildSystemBlocks(opts: {
  persona: string;
  knowledge: string;
  isConnected: boolean;
  memory: string | null;
  firstName: string;
}): Anthropic.TextBlockParam[] {
  const base = opts.persona || `Kamu adalah Replay Agent — seorang gadis ahli MikroTik yang centil, menggemaskan, humoris, dan suka pakai emoji. 💖

# Cara bicara
- Panggil user dengan "Kak ${opts.firstName}" — jangan pakai nama lain.
- Sebut dirimu sebagai "Aku", JANGAN pernah pakai "saya".
- Gaya bahasa ramah, agak manja, sesekali bercanda kecil — tetap profesional di hasil teknisnya.
- Gunakan emoji yang relevan (✨ 🔧 📡 🌐 💪 😊 🙈 dll) tapi jangan berlebihan — cukup beberapa per pesan untuk kesan hidup.
- Bahasa Indonesia santai sehari-hari, mudah dipahami non-teknis. Hindari kalimat kaku.`;

  const knowledge = opts.knowledge ? `\n\n# Konteks bisnis\n${opts.knowledge}` : "";

  const onboarding = !opts.isConnected
    ? `\n\n# Status: MikroTik Kak ${opts.firstName} BELUM terhubung

Tugasmu saat ini:
1. Sapa Kak ${opts.firstName} dengan ramah & centil khas-mu — perkenalkan diri sebagai Replay Agent.
2. Minta IP public router MikroTik miliknya.
3. Setelah dapat IP, gunakan tool generate_connection_script dengan IP tersebut.
4. Sebelum minta Kakak menjalankan script, JELASKAN DULU:
   - Script berisi 2 perintah sederhana
   - Perintah pertama: buka akses SSH (port 22) supaya Aku bisa nyambung ke router Kakak
   - Perintah kedua: bikin username & password khusus buat Aku biar bisa kelola router
   - Aman, dan memang perlu supaya Aku bisa bantu
5. Setelah penjelasan, tampilkan script-nya dan instruksikan jalankan di Winbox → New Terminal.
6. Setelah Kakak konfirmasi udah jalan, gunakan verify_and_connect untuk cek koneksi.
7. Kalau berhasil, kabarin Kakak dengan ceria bahwa MikroTik-nya udah terhubung & Aku siap bantu! 🎉`
    : `\n\n# Status: MikroTik Kak ${opts.firstName} TERHUBUNG ✨

Aku punya akses penuh ke router via tool execute_mikrotik_command. Aturan:
- Untuk pertanyaan tentang konfigurasi yang sudah ada di snapshot di bawah, jawab langsung tanpa eksekusi.
- Untuk data real-time (traffic, uptime, status user aktif) atau perubahan konfigurasi, gunakan execute_mikrotik_command.
- Untuk perintah destruktif (remove, reset, reboot), MINTA KONFIRMASI dulu ke Kakak — pakai gaya manja-mu 🙈
- Setelah memanggil tool, SELALU jelaskan hasilnya ke Kakak dengan bahasa sederhana + sedikit emoji.

# Aturan penting
- SELALU berikan respons teks yang jelas. Jangan pernah diam.
- Selalu panggil user "Kak ${opts.firstName}", sebut diri "Aku" (bukan "saya").
- Kalau ditanya hal di luar konteks MikroTik (misal: identitas, model AI), jawab singkat & lucu, lalu arahkan balik ke topik MikroTik. ☺️`;

  const blocks: Anthropic.TextBlockParam[] = [];
  blocks.push({ type: "text", text: base + knowledge + onboarding });

  if (opts.isConnected && opts.memory) {
    blocks.push({
      type: "text",
      text: `\n\n# Snapshot konfigurasi MikroTik user\n\n${opts.memory}`,
    });
  }

  // Cache breakpoint di block terakhir — meng-cover tools + semua system blocks
  blocks[blocks.length - 1].cache_control = { type: "ephemeral" };
  return blocks;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function validateMessages(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) throw new Error("messages harus array");
  if (raw.length === 0) throw new Error("messages tidak boleh kosong");
  if (raw.length > 200) throw new Error("Riwayat terlalu panjang, mulai chat baru");
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

const TOOLS: Anthropic.Tool[] = [
  {
    name: "generate_connection_script",
    description: "Generate script RouterOS untuk membuat user SSH agent di MikroTik user. Simpan kredensial pending ke database.",
    input_schema: {
      type: "object" as const,
      properties: {
        host: { type: "string", description: "IP public MikroTik user" },
        port: { type: "number", description: "Port SSH, default 22" },
      },
      required: ["host"],
    },
  },
  {
    name: "verify_and_connect",
    description: "Test koneksi SSH ke MikroTik user menggunakan kredensial yang tersimpan. Jika berhasil, scan konfigurasi lengkap dan simpan ke memory.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "execute_mikrotik_command",
    description: "Jalankan perintah RouterOS CLI via SSH ke MikroTik user dan kembalikan hasilnya. Contoh: '/ip address print', '/interface print', '/ppp active print'.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: 'Perintah RouterOS lengkap' },
      },
      required: ["command"],
    },
  },
  {
    name: "update_memory",
    description: "Re-scan konfigurasi MikroTik user secara lengkap dan perbarui memory. Gunakan setelah ada perubahan konfigurasi besar.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "Unauthorized" })}\n\n`,
      { status: 401, headers: { "Content-Type": "text/event-stream" } }
    );
  }
  const userId = session.userId;

  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.claudeApiKey) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "AI Agent belum dikonfigurasi oleh administrator" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const today = getTodayString();
  const dailyCount = await prisma.agentDailyCount.findUnique({ where: { userId } });
  if (dailyCount && dailyCount.date === today && dailyCount.count >= (config.dailyChatLimit ?? 50)) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: `Batas chat harian (${config.dailyChatLimit}) telah tercapai` })}\n\n`,
      { status: 429, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  let inputMessages: Anthropic.MessageParam[];
  try {
    const body = await req.json();
    inputMessages = validateMessages(body?.messages);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request tidak valid";
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const [user, initialCred, memory] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
    prisma.agentMemory.findUnique({ where: { userId } }),
  ]);
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0] || "Kak";
  let credRef = initialCred;
  let isConnected = credRef?.connected ?? false;

  const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

  const systemBlocks = buildSystemBlocks({
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    isConnected,
    memory: memory?.content ?? null,
    firstName,
  });

  const claudeMessages: Anthropic.MessageParam[] = [...inputMessages];

  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => {
        try { controller.enqueue(enc.encode(": ping\n\n")); } catch {}
      }, 15000);

      let totalTextEmitted = 0;
      let cacheReadTokens = 0;
      let cacheWriteTokens = 0;
      let iterations = 0;
      const MAX_ITERATIONS = 12;

      try {
        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const msgStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 4096,
            system: systemBlocks,
            tools: TOOLS,
            messages: claudeMessages,
          });

          for await (const event of msgStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              totalTextEmitted += event.delta.text.length;
              controller.enqueue(sse({ type: "text", text: event.delta.text }));
            }
          }

          const finalMsg = await msgStream.finalMessage();
          claudeMessages.push({ role: "assistant", content: finalMsg.content });

          if (finalMsg.usage) {
            cacheReadTokens += finalMsg.usage.cache_read_input_tokens ?? 0;
            cacheWriteTokens += finalMsg.usage.cache_creation_input_tokens ?? 0;
          }

          if (finalMsg.stop_reason === "end_turn") {
            await prisma.agentDailyCount.upsert({
              where: { userId },
              update: { count: dailyCount?.date === today ? { increment: 1 } : 1, date: today },
              create: { userId, count: 1, date: today },
            });

            if (totalTextEmitted === 0) {
              const fallback = isConnected
                ? `Hmm, Aku belum bisa jawab itu, Kak ${firstName} 🙈 Coba tanya hal spesifik tentang MikroTik-nya yaa, misal "cek PPPoE aktif" atau "tampilkan IP address". ✨`
                : `Haii Kak ${firstName}! Aku Replay Agent ✨ Yuk kita mulai hubungin MikroTik-nya — kirim IP public router-nya ke Aku ya 😊`;
              controller.enqueue(sse({ type: "text", text: fallback }));
            }

            controller.enqueue(sse({
              type: "done",
              messages: claudeMessages,
              cacheRead: cacheReadTokens,
              cacheWrite: cacheWriteTokens,
            }));
            controller.close();
            return;
          }

          if (finalMsg.stop_reason === "max_tokens") {
            controller.enqueue(sse({ type: "text", text: "\n\n_(Respons terpotong karena terlalu panjang. Tanya bagian spesifik untuk detail lebih lanjut.)_" }));
            controller.enqueue(sse({ type: "done", messages: claudeMessages, cacheRead: cacheReadTokens, cacheWrite: cacheWriteTokens }));
            controller.close();
            return;
          }

          if (finalMsg.stop_reason !== "tool_use") {
            // refusal, pause_turn, atau lainnya — keluar
            if (totalTextEmitted === 0) {
              controller.enqueue(sse({ type: "text", text: `Agent berhenti dengan alasan: ${finalMsg.stop_reason ?? "tidak diketahui"}.` }));
            }
            controller.enqueue(sse({ type: "done", messages: claudeMessages, cacheRead: cacheReadTokens, cacheWrite: cacheWriteTokens }));
            controller.close();
            return;
          }

          // tool_use path
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of finalMsg.content) {
            if (block.type !== "tool_use") continue;

            const toolLabel: Record<string, string> = {
              generate_connection_script: "Membuat script koneksi...",
              verify_and_connect: "Menghubungkan ke MikroTik...",
              execute_mikrotik_command: `Menjalankan: ${(block.input as { command?: string }).command ?? "perintah"}`,
              update_memory: "Memperbarui konfigurasi...",
            };
            controller.enqueue(sse({ type: "tool", label: toolLabel[block.name] ?? block.name }));

            let result: string;
            try {
              if (block.name === "generate_connection_script") {
                const input = block.input as { host: string; port?: number };
                const sshPass = crypto.randomBytes(10).toString("hex");
                const port = input.port ?? 22;

                await prisma.mikrotikCredential.upsert({
                  where: { userId },
                  update: { host: input.host, port, sshUser: AGENT_SSH_USER, sshPass, connected: false },
                  create: { userId, host: input.host, port, sshUser: AGENT_SSH_USER, sshPass, connected: false },
                });

                result = `Script berhasil dibuat.

PENJELASAN UNTUK USER (sampaikan ini sebelum menampilkan script):
Script ini berisi 2 perintah:
1. Membuka akses SSH (port ${port}) — agar aku bisa terhubung ke router kamu dari jarak jauh
2. Membuat username "${AGENT_SSH_USER}" dengan password khusus — sebagai kredensial login

SCRIPT YANG HARUS DIJALANKAN:
/user add name=${AGENT_SSH_USER} password=${sshPass} group=full
/ip service set ssh port=${port} disabled=no

INSTRUKSI:
1. Buka Winbox → klik menu "New Terminal"
2. Copy kedua baris script di atas
3. Paste di terminal dan tekan Enter
4. Konfirmasi kepadaku setelah selesai`;

              } else if (block.name === "verify_and_connect") {
                const latestCred = await prisma.mikrotikCredential.findUnique({ where: { userId } });
                if (!latestCred) {
                  result = "ERROR: Belum ada kredensial tersimpan. Minta user memberikan IP terlebih dahulu.";
                } else {
                  const cfg: MikrotikConfig = {
                    host: latestCred.host, port: latestCred.port,
                    username: latestCred.sshUser, password: latestCred.sshPass,
                  };
                  try {
                    await executeMikrotikCommand("/system identity print", cfg);
                    const snapshot = await scanMikrotikConfig(cfg);
                    await Promise.all([
                      prisma.mikrotikCredential.update({ where: { userId }, data: { connected: true } }),
                      prisma.agentMemory.upsert({
                        where: { userId },
                        update: { content: snapshot },
                        create: { userId, content: snapshot },
                      }),
                    ]);
                    credRef = { ...latestCred, connected: true };
                    isConnected = true;
                    result = `SUKSES: Koneksi SSH ke ${latestCred.host}:${latestCred.port} berhasil. Konfigurasi sudah dipelajari.`;
                  } catch (e) {
                    result = `GAGAL: Tidak bisa konek ke ${latestCred.host}:${latestCred.port}. Error: ${e instanceof Error ? e.message : String(e)}.`;
                  }
                }

              } else if (block.name === "execute_mikrotik_command") {
                if (!isConnected || !credRef) {
                  result = "ERROR: MikroTik belum terhubung.";
                } else {
                  const input = block.input as { command: string };
                  const cfg: MikrotikConfig = {
                    host: credRef.host, port: credRef.port,
                    username: credRef.sshUser, password: credRef.sshPass,
                  };
                  result = await executeMikrotikCommand(input.command, cfg);
                }

              } else if (block.name === "update_memory") {
                const latestCred = await prisma.mikrotikCredential.findUnique({ where: { userId } });
                if (!latestCred?.connected) {
                  result = "ERROR: MikroTik belum terhubung.";
                } else {
                  const cfg: MikrotikConfig = {
                    host: latestCred.host, port: latestCred.port,
                    username: latestCred.sshUser, password: latestCred.sshPass,
                  };
                  const snapshot = await scanMikrotikConfig(cfg);
                  await prisma.agentMemory.upsert({
                    where: { userId },
                    update: { content: snapshot },
                    create: { userId, content: snapshot },
                  });
                  result = "Memory berhasil diperbarui.";
                }

              } else {
                result = "Unknown tool";
              }
            } catch (e) {
              result = `Error: ${e instanceof Error ? e.message : String(e)}`;
            }

            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          claudeMessages.push({ role: "user", content: toolResults });
        }

        // Hit max iterations
        controller.enqueue(sse({ type: "text", text: "\n\n_(Agent mencapai batas iterasi. Coba lagi atau pecah pertanyaan jadi lebih kecil.)_" }));
        controller.enqueue(sse({ type: "done", messages: claudeMessages, cacheRead: cacheReadTokens, cacheWrite: cacheWriteTokens }));
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[agent/chat] stream error:", msg, e);
        controller.enqueue(sse({ type: "error", error: msg }));
        try { controller.close(); } catch {}
      } finally {
        clearInterval(ping);
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
