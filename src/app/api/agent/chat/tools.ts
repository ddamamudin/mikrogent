import { prisma } from "@/lib/prisma";
import { executeMikrotikCommand, scanMikrotikConfig, MikrotikConfig } from "@/lib/mikrotik";

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: "verify_and_connect",
    description:
      "Test koneksi SSH ke MikroTik user menggunakan kredensial yang tersimpan. Jika berhasil, scan konfigurasi lengkap dan simpan ke memory.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "execute_mikrotik_command",
    description:
      "Jalankan perintah RouterOS CLI via SSH ke MikroTik user dan kembalikan hasilnya. Contoh: '/ip address print', '/interface print', '/ppp active print'.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Perintah RouterOS lengkap" },
      },
      required: ["command"],
    },
  },
  {
    name: "update_memory",
    description:
      "Re-scan konfigurasi MikroTik user secara lengkap dan perbarui memory. Gunakan setelah ada perubahan konfigurasi besar.",
    parameters: { type: "object", properties: {}, required: [] },
  },
];

export const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  verify_and_connect: () => "Mengecek koneksi MikroTik...",
  execute_mikrotik_command: (input) => `Menjalankan: ${(input as { command?: string }).command ?? "perintah"}`,
  update_memory: () => "Memperbarui konfigurasi...",
};

export interface ToolContext {
  userId: string;
  isConnected: boolean;
  setConnected: (v: boolean) => void;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  try {
    if (name === "verify_and_connect") {
      const cred = await prisma.mikrotikCredential.findUnique({ where: { userId: ctx.userId } });
      if (!cred) return "ERROR: Belum ada kredensial tersimpan. Minta user memberikan IP terlebih dahulu.";

      const cfg: MikrotikConfig = {
        host: cred.host, port: cred.port,
        username: cred.sshUser, password: cred.sshPass,
      };
      try {
        await executeMikrotikCommand("/system identity print", cfg);
        const snapshot = await scanMikrotikConfig(cfg);
        await Promise.all([
          prisma.mikrotikCredential.update({ where: { userId: ctx.userId }, data: { connected: true } }),
          prisma.agentMemory.upsert({
            where: { userId: ctx.userId },
            update: { content: snapshot },
            create: { userId: ctx.userId, content: snapshot },
          }),
        ]);
        ctx.setConnected(true);
        return `SUKSES: Koneksi SSH ke ${cred.host}:${cred.port} berhasil. Konfigurasi sudah dipelajari.`;
      } catch (e) {
        return `GAGAL: Tidak bisa konek ke ${cred.host}:${cred.port}. Error: ${e instanceof Error ? e.message : String(e)}.`;
      }
    }

    if (name === "execute_mikrotik_command") {
      if (!ctx.isConnected) return "ERROR: MikroTik belum terhubung.";
      const cred = await prisma.mikrotikCredential.findUnique({ where: { userId: ctx.userId } });
      if (!cred) return "ERROR: Kredensial tidak ditemukan.";
      const cfg: MikrotikConfig = {
        host: cred.host, port: cred.port,
        username: cred.sshUser, password: cred.sshPass,
      };
      const command = String(input.command ?? "");
      if (!command) return "ERROR: command kosong.";
      const output = await executeMikrotikCommand(command, cfg);
      const MAX = 8000;
      if (output.length > MAX) {
        return output.slice(0, MAX) +
          `\n\n[Output dipotong: ${output.length} → ${MAX} karakter. Gunakan filter RouterOS untuk hasil lebih spesifik - contoh: 'where', '?status=...', 'count-only', atau 'print brief'.]`;
      }
      return output;
    }

    if (name === "update_memory") {
      const cred = await prisma.mikrotikCredential.findUnique({ where: { userId: ctx.userId } });
      if (!cred?.connected) return "ERROR: MikroTik belum terhubung.";
      const cfg: MikrotikConfig = {
        host: cred.host, port: cred.port,
        username: cred.sshUser, password: cred.sshPass,
      };
      const snapshot = await scanMikrotikConfig(cfg);
      await prisma.agentMemory.upsert({
        where: { userId: ctx.userId },
        update: { content: snapshot },
        create: { userId: ctx.userId, content: snapshot },
      });
      return "Memory berhasil diperbarui.";
    }

    return "Unknown tool";
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
