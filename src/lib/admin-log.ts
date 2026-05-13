import { prisma } from "@/lib/prisma";
import { RT } from "@/lib/realtime/events";

export async function logAdmin(opts: {
  adminId: string;
  adminName: string;
  action: string;
  details?: string;
}): Promise<void> {
  try {
    const row = await prisma.adminLog.create({
      data: {
        adminId: opts.adminId,
        adminName: opts.adminName,
        action: opts.action,
        details: opts.details ?? null,
      },
    });
    RT.adminLog({
      id: row.id,
      adminId: row.adminId,
      adminName: row.adminName,
      action: row.action,
      details: row.details,
      createdAt: row.createdAt.toISOString(),
    }).catch(() => {});
  } catch (e) {
    console.error("[admin-log] failed:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Resolve admin name from session userId (used when only userId is available).
 * Returns name or fallback string.
 */
export async function getAdminName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name ?? "Unknown";
}
