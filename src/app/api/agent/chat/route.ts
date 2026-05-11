export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { executeMikrotikCommand, scanMikrotikConfig, MikrotikConfig } from "@/lib/mikrotik";
import crypto from "crypto";

const AGENT_SSH_USER = "replay-agent";
const enc = new TextEncoder();

function sse(data: object): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function buildSystemBlocks(opts: {
  persona: string;
  knowledge: string;
  isConnected: boolean;
  memory: string | null;
}): Anthropic.TextBlockParam[] {
  const base = opts.persona ||
    "Kamu adalah asisten jaringan profesional yang membantu reseller ISP mengelola router MikroTik mereka menggunakan bahasa Indonesia yang ramah dan mudah dipahami.";

  const knowledge = opts.knowledge ? `\n\nKonteks bisnis:\n${opts.knowledge}` : "";

  const onboarding = !opts.isConnected
    ? `\n\nMikroTik user BELUM terhubung. Tugasmu saat ini:
1. Sapa user dengan ramah dan perkenalkan dirimu
2. Minta IP public router MikroTik mereka
3. Setelah user memberikan IP, gunakan tool generate_connection_script dengan IP tersebut
4. Sebelum meminta user menjalankan script, JELASKAN DULU kepada user bahwa:
   - Script tersebut berisi 2 perintah sederhana
   - Perintah pertama: membuka akses SSH (port 22) agar kamu bisa terhubung ke router mereka
   - Perintah kedua: membuat username dan password khusus untukmu agar bisa masuk dan mengelola router
   - Semua ini aman dan diperlukan agar kamu bisa membantu mereka
5. Setelah penjelasan, tampilkan script dan instruksikan user untuk menjalankannya di Winbox → New Terminal
6. Setelah user konfirmasi sudah menjalankan, gunakan tool verify_and_connect untuk mengecek koneksi
7. Jika berhasil, beritahu user bahwa MikroTik sudah terhubung, kamu sudah mempelajari konfigurasinya, dan siap membantu`
    : "";

  const capabilities = opts.isConnected
    ? `\n\nKamu memiliki akses penuh ke router MikroTik user. Gunakan tool execute_mikrotik_command untuk mengambil data real-time atau menjalankan perintah konfigurasi. Selalu jelaskan hasil dengan bahasa sederhana. Untuk perintah destruktif (delete, reset, reboot), minta konfirmasi terlebih dahulu.

PENTING: Setiap kali user bertanya, kamu HARUS selalu memberikan respons teks yang jelas. Jika kamu memanggil tool, lanjutkan dengan menjelaskan hasilnya. Jangan pernah diam tanpa balasan.`
    : "";

  const blocks: Anthropic.TextBlockParam[] = [];

  // Block 1: persona + knowledge + onboarding/capabilities (stabil per sesi)
  blocks.push({ type: "text", text: base + knowledge + onboarding + capabilities });

  // Block 2: memory snapshot (besar tapi stabil sampai user re-scan)
  if (opts.isConnected && opts.memory) {
    blocks.push({
      type: "text",
      text: `\n\nKonfigurasi MikroTik user (snapshot terakhir):\n${opts.memory}`,
    });
  }

  // Cache breakpoint pada block terakhir — cover tools + semua system blocks
  blocks[blocks.length - 1].cache_control = { type: "ephemeral" };

  return blocks;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Validate incoming messages array — prevent fake assistant turns / tool_result injection
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
    // assistant content boleh array (text + tool_use blocks dari turn sebelumnya)
    // user content boleh string atau array (text + tool_result blocks)
    if (typeof msg.content !== "string" && !Array.isArray(msg.content)) {
      throw new Error("Format content tidak valid");
    }
    out.push(msg as Anthropic.MessageParam);
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Auth
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "Unauthorized" })}\n\n`,
      { status: 401, headers: { "Content-Type": "text/event-stream" } }
    );
  }
  const userId = session.userId;

  // Load config
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.claudeApiKey) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: "AI Agent belum dikonfigurasi oleh administrator" })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // Daily chat limit
  const today = getTodayString();
  const dailyCount = await prisma.agentDailyCount.findUnique({ where: { userId } });
  if (dailyCount && dailyCount.date === today && dailyCount.count >= (config.dailyChatLimit ?? 50)) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", error: `Batas chat harian (${config.dailyChatLimit}) telah tercapai` })}\n\n`,
      { status: 429, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // Parse + validate input
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

  // Load user MikroTik data — `credRef` is mutable so we can refresh after verify_and_connect
  const [initialCred, memory] = await Promise.all([
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
    prisma.agentMemory.findUnique({ where: { userId } }),
  ]);
  let credRef = initialCred;
  let isConnected = credRef?.connected ?? false;

  const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

  const systemBlocks = buildSystemBlocks({
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    isConnected,
    memory: memory?.content ?? null,
  });

  const tools: Anthropic.Tool[] = [
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
      description: "Jalankan perintah RouterOS CLI via SSH ke MikroTik user dan kembalikan hasilnya.",
      input_schema: {
        type: "object" as const,
        properties: {
          command: { type: "string", description: 'Perintah RouterOS, contoh: "/ip address print"' },
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

  const claudeMessages: Anthropic.MessageParam[] = [...inputMessages];

  const stream = new ReadableStream({
    async start(controller) {
      // Periodic ping to keep Cloudflare/QUIC connection alive
      const ping = setInterval(() => {
        try { controller.enqueue(enc.encode(": ping\n\n")); } catch {}
      }, 15000);

      let totalTextEmitted = 0;
      let cacheReadTokens = 0;
      let cacheWriteTokens = 0;

      try {
        while (true) {
          // Stream Claude response
          const msgStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            thinking: { type: "adaptive" },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...({ output_config: { effort: "medium" } } as any),
            system: systemBlocks,
            tools,
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

          // Track caching stats
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

            // Fallback jika agent tidak emit text sama sekali
            if (totalTextEmitted === 0) {
              controller.enqueue(sse({
                type: "text",
                text: isConnected
                  ? "Maaf, saya tidak bisa memproses pertanyaan itu. Coba ketik pertanyaan yang lebih spesifik tentang router MikroTik kamu."
                  : "Halo! Saya MikroTik AI Agent. Untuk mulai, silakan berikan IP public router MikroTik kamu.",
              }));
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

          if (finalMsg.stop_reason === "tool_use") {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of finalMsg.content) {
              if (block.type !== "tool_use") continue;

              // Notify client which tool is running
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
2. Membuat username "${AGENT_SSH_USER}" dengan password khusus — sebagai kredensial login yang aku gunakan untuk mengakses dan mengelola router kamu

Ini aman dan hanya digunakan oleh sistem RAIA untuk keperluan pengelolaan router kamu.

SCRIPT YANG HARUS DIJALANKAN:
/user add name=${AGENT_SSH_USER} password=${sshPass} group=full
/ip service set ssh port=${port} disabled=no

INSTRUKSI MENJALANKAN:
1. Buka Winbox → klik menu "New Terminal"
2. Copy kedua baris script di atas
3. Paste di terminal dan tekan Enter
4. Konfirmasi kepadaku setelah selesai`;

                } else if (block.name === "verify_and_connect") {
                  const latestCred = await prisma.mikrotikCredential.findUnique({ where: { userId } });
                  if (!latestCred) {
                    result = "ERROR: Belum ada kredensial tersimpan. Minta user memberikan IP terlebih dahulu.";
                  } else {
                    const mikrotikConfig: MikrotikConfig = {
                      host: latestCred.host,
                      port: latestCred.port,
                      username: latestCred.sshUser,
                      password: latestCred.sshPass,
                    };
                    try {
                      await executeMikrotikCommand("/system identity print", mikrotikConfig);
                      const snapshot = await scanMikrotikConfig(mikrotikConfig);
                      await Promise.all([
                        prisma.mikrotikCredential.update({ where: { userId }, data: { connected: true } }),
                        prisma.agentMemory.upsert({
                          where: { userId },
                          update: { content: snapshot },
                          create: { userId, content: snapshot },
                        }),
                      ]);
                      // Refresh in-memory state so execute_mikrotik_command works in same loop
                      credRef = { ...latestCred, connected: true };
                      isConnected = true;
                      result = `SUKSES: Koneksi SSH ke ${latestCred.host}:${latestCred.port} berhasil. Konfigurasi MikroTik sudah dipelajari dan disimpan ke memory.`;
                    } catch (e) {
                      result = `GAGAL: Tidak bisa konek ke ${latestCred.host}:${latestCred.port}. Error: ${e instanceof Error ? e.message : String(e)}. Pastikan script sudah dijalankan dan IP/port benar.`;
                    }
                  }

                } else if (block.name === "execute_mikrotik_command") {
                  if (!isConnected || !credRef) {
                    result = "ERROR: MikroTik belum terhubung.";
                  } else {
                    const input = block.input as { command: string };
                    const mikrotikConfig: MikrotikConfig = {
                      host: credRef.host, port: credRef.port,
                      username: credRef.sshUser, password: credRef.sshPass,
                    };
                    result = await executeMikrotikCommand(input.command, mikrotikConfig);
                  }

                } else if (block.name === "update_memory") {
                  const latestCred = await prisma.mikrotikCredential.findUnique({ where: { userId } });
                  if (!latestCred?.connected) {
                    result = "ERROR: MikroTik belum terhubung.";
                  } else {
                    const mikrotikConfig: MikrotikConfig = {
                      host: latestCred.host, port: latestCred.port,
                      username: latestCred.sshUser, password: latestCred.sshPass,
                    };
                    const snapshot = await scanMikrotikConfig(mikrotikConfig);
                    await prisma.agentMemory.upsert({
                      where: { userId },
                      update: { content: snapshot },
                      create: { userId, content: snapshot },
                    });
                    result = "Memory berhasil diperbarui dengan konfigurasi terkini.";
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
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(sse({ type: "error", error: msg }));
        controller.close();
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
