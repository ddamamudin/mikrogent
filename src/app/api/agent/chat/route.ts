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

function buildSystemPrompt(opts: {
  persona: string;
  knowledge: string;
  isConnected: boolean;
  memory: string | null;
}): string {
  const base = opts.persona ||
    "Kamu adalah asisten jaringan profesional yang membantu reseller ISP mengelola router MikroTik mereka menggunakan bahasa Indonesia yang ramah dan mudah dipahami.";

  const knowledge = opts.knowledge
    ? `\n\nKonteks bisnis:\n${opts.knowledge}`
    : "";

  const MAX_MEMORY = 15000;
  const memoryContent = opts.memory
    ? opts.memory.length > MAX_MEMORY
      ? opts.memory.slice(0, MAX_MEMORY) + `\n\n...[snapshot terpotong, gunakan execute_mikrotik_command untuk detail lebih lanjut]`
      : opts.memory
    : null;
  const mikrotikCtx = opts.isConnected && memoryContent
    ? `\n\nKonfigurasi MikroTik user (snapshot terakhir):\n${memoryContent}`
    : "";

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
    ? `\n\nKamu memiliki akses penuh ke router MikroTik user. Gunakan tool execute_mikrotik_command untuk mengambil data real-time atau menjalankan perintah konfigurasi. Selalu jelaskan hasil dengan bahasa sederhana. Untuk perintah destruktif (delete, reset, reboot), minta konfirmasi terlebih dahulu.`
    : "";

  return base + knowledge + mikrotikCtx + onboarding + capabilities;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
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

  // Load user MikroTik data
  const [cred, memory] = await Promise.all([
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
    prisma.agentMemory.findUnique({ where: { userId } }),
  ]);
  const isConnected = cred?.connected ?? false;

  const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

  const systemPrompt = buildSystemPrompt({
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

  const { messages }: { messages: Anthropic.MessageParam[] } = await req.json();
  const claudeMessages: Anthropic.MessageParam[] = [...messages];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          // Stream Claude response
          const msgStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages: claudeMessages,
          });

          for await (const event of msgStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              controller.enqueue(sse({ type: "text", text: event.delta.text }));
            }
          }

          const finalMsg = await msgStream.finalMessage();
          claudeMessages.push({ role: "assistant", content: finalMsg.content });

          if (finalMsg.stop_reason === "end_turn") {
            await prisma.agentDailyCount.upsert({
              where: { userId },
              update: { count: dailyCount?.date === today ? { increment: 1 } : 1, date: today },
              create: { userId, count: 1, date: today },
            });
            controller.enqueue(sse({ type: "done", messages: claudeMessages }));
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
                      result = `SUKSES: Koneksi SSH ke ${latestCred.host}:${latestCred.port} berhasil. Konfigurasi MikroTik sudah dipelajari dan disimpan ke memory.`;
                    } catch (e) {
                      result = `GAGAL: Tidak bisa konek ke ${latestCred.host}:${latestCred.port}. Error: ${e instanceof Error ? e.message : String(e)}. Pastikan script sudah dijalankan dan IP/port benar.`;
                    }
                  }

                } else if (block.name === "execute_mikrotik_command") {
                  if (!isConnected || !cred) {
                    result = "ERROR: MikroTik belum terhubung.";
                  } else {
                    const input = block.input as { command: string };
                    const mikrotikConfig: MikrotikConfig = {
                      host: cred.host, port: cred.port,
                      username: cred.sshUser, password: cred.sshPass,
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
