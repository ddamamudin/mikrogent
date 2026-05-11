export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { executeMikrotikCommand, scanMikrotikConfig, MikrotikConfig } from "@/lib/mikrotik";
import crypto from "crypto";

const AGENT_SSH_USER = "replay-agent";

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

  const mikrotikCtx = opts.isConnected && opts.memory
    ? `\n\nKonfigurasi MikroTik user (snapshot terakhir):\n${opts.memory}`
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId;

  // Load config
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.claudeApiKey) {
    return NextResponse.json({ error: "AI Agent belum dikonfigurasi oleh administrator" }, { status: 503 });
  }

  // Daily chat limit
  const today = getTodayString();
  const dailyCount = await prisma.agentDailyCount.findUnique({ where: { userId } });
  if (dailyCount && dailyCount.date === today && dailyCount.count >= (config.dailyChatLimit ?? 50)) {
    return NextResponse.json({ error: `Batas chat harian (${config.dailyChatLimit}) telah tercapai` }, { status: 429 });
  }

  // Load user MikroTik data
  const [cred, memory] = await Promise.all([
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
    prisma.agentMemory.findUnique({ where: { userId } }),
  ]);
  const isConnected = cred?.connected ?? false;

  // Build Anthropic client with admin's API key
  const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

  const systemPrompt = buildSystemPrompt({
    persona: config.agentPersona ?? "",
    knowledge: config.agentKnowledge ?? "",
    isConnected,
    memory: memory?.content ?? null,
  });

  // Tools
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

  // Agentic loop
  const { messages }: { messages: Anthropic.MessageParam[] } = await req.json();
  const claudeMessages: Anthropic.MessageParam[] = [...messages];

  try {
    while (true) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: claudeMessages,
      });

      claudeMessages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") {
        // Update daily count
        await prisma.agentDailyCount.upsert({
          where: { userId },
          update: { count: dailyCount?.date === today ? { increment: 1 } : 1, date: today },
          create: { userId, count: 1, date: today },
        });

        const textBlock = response.content.find((b) => b.type === "text");
        return NextResponse.json({
          message: textBlock ? (textBlock as Anthropic.TextBlock).text : "",
          messages: claudeMessages,
        });
      }

      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          let result: string;

          try {
            if (block.name === "generate_connection_script") {
              const input = block.input as { host: string; port?: number };
              const sshPass = crypto.randomBytes(10).toString("hex");
              const port = input.port ?? 22;

              // Simpan pending credentials
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
                  // Test koneksi
                  await executeMikrotikCommand("/system identity print", mikrotikConfig);
                  // Scan full config
                  const snapshot = await scanMikrotikConfig(mikrotikConfig);
                  // Simpan ke DB
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
