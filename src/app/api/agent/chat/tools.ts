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
    name: "set_active_router",
    description:
      "Pilih router aktif untuk semua perintah berikutnya. Wajib dipanggil sekali di awal saat user pilih router, dan setiap kali user minta ganti router. Sticky sampai user ganti.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nama router persis seperti yang tertulis di daftar router user (mis. 'Router 1', 'Router Utama', dll)." },
      },
      required: ["name"],
    },
  },
  {
    name: "execute_mikrotik_command",
    description:
      "Jalankan perintah RouterOS CLI via SSH ke router aktif user. Contoh: '/ip address print', '/interface print'. Hanya jalan kalau router aktif sudah dipilih lewat set_active_router.",
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
      "Re-scan konfigurasi router aktif secara lengkap dan perbarui memory snapshot-nya. Gunakan setelah ada perubahan konfigurasi besar.",
    parameters: { type: "object", properties: {}, required: [] },
  },
];

export const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  set_active_router: (input) => `Memilih router: ${(input as { name?: string }).name ?? ""}`,
  execute_mikrotik_command: (input) => `Menjalankan: ${(input as { command?: string }).command ?? "perintah"}`,
  update_memory: () => "Memperbarui konfigurasi...",
};

export interface ToolContext {
  userId: string;
  // Active router state - bisa berubah dalam satu sesi via set_active_router
  activeCredentialId: string | null;
  setActiveCredentialId: (id: string | null) => void;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  try {
    if (name === "set_active_router") {
      const target = String(input.name ?? "").trim();
      if (!target) return "ERROR: Nama router tidak diberikan.";

      // Match nama case-insensitive exact, fallback ke contains
      const all = await prisma.mikrotikCredential.findMany({
        where: { userId: ctx.userId },
        select: { id: true, name: true, host: true, connected: true },
      });
      if (all.length === 0) return "ERROR: User belum punya router. Suruh user isi data router di menu Router dulu.";

      const lower = target.toLowerCase();
      let match = all.find((c) => c.name.toLowerCase() === lower);
      if (!match) match = all.find((c) => c.name.toLowerCase().includes(lower));
      if (!match) {
        const names = all.map((c) => c.name).join(", ");
        return `ERROR: Router "${target}" tidak ditemukan. Pilihan yang valid: ${names}`;
      }
      if (!match.connected) {
        return `ERROR: Router "${match.name}" (${match.host}) belum terhubung. Suruh user verifikasi koneksi router itu dulu di menu Router.`;
      }

      await prisma.agentChatSession.upsert({
        where: { userId: ctx.userId },
        update: { activeCredentialId: match.id },
        create: { userId: ctx.userId, activeCredentialId: match.id, messages: [], apiMessages: [] },
      });
      ctx.setActiveCredentialId(match.id);
      return `SUKSES: Router aktif sekarang "${match.name}" (${match.host}). Perintah selanjutnya akan jalan ke router ini.`;
    }

    if (name === "execute_mikrotik_command") {
      if (!ctx.activeCredentialId) {
        return "ERROR: Belum ada router aktif. Panggil set_active_router dulu dengan nama router yang dipilih user.";
      }
      const cred = await prisma.mikrotikCredential.findUnique({ where: { id: ctx.activeCredentialId } });
      if (!cred || cred.userId !== ctx.userId) {
        return "ERROR: Router aktif tidak ditemukan (mungkin sudah dihapus). Suruh user pilih ulang router.";
      }
      if (!cred.connected) {
        return `ERROR: Router "${cred.name}" tidak terhubung. Suruh user verifikasi koneksi.`;
      }
      const command = String(input.command ?? "");
      if (!command) return "ERROR: command kosong.";
      const cfg: MikrotikConfig = { host: cred.host, port: cred.port, username: cred.sshUser, password: cred.sshPass };
      const output = await executeMikrotikCommand(command, cfg);
      const MAX = 8000;
      if (output.length > MAX) {
        return output.slice(0, MAX) +
          `\n\n[Output dipotong: ${output.length} → ${MAX} karakter. Gunakan filter RouterOS untuk hasil lebih spesifik - contoh: 'where', '?status=...', 'count-only', atau 'print brief'.]`;
      }
      return output;
    }

    if (name === "update_memory") {
      if (!ctx.activeCredentialId) return "ERROR: Belum ada router aktif.";
      const cred = await prisma.mikrotikCredential.findUnique({ where: { id: ctx.activeCredentialId } });
      if (!cred || cred.userId !== ctx.userId || !cred.connected) {
        return "ERROR: Router aktif tidak terhubung atau tidak ditemukan.";
      }
      const cfg: MikrotikConfig = { host: cred.host, port: cred.port, username: cred.sshUser, password: cred.sshPass };
      const snapshot = await scanMikrotikConfig(cfg);
      await prisma.agentMemory.upsert({
        where: { credentialId: cred.id },
        update: { content: snapshot },
        create: { credentialId: cred.id, content: snapshot },
      });
      return `Memory router "${cred.name}" berhasil diperbarui.`;
    }

    return "Unknown tool";
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
