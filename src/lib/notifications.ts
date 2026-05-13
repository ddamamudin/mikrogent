import { prisma } from "@/lib/prisma";
import { RT } from "@/lib/realtime/events";

export type NotificationType =
  | "user_registered"
  | "user_email_verified"
  | "feedback_received"
  | "feedback_replied"
  | "feedback_resolved";

export type NotifInput = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  meta?: Record<string, unknown>;
};

/**
 * Fan-out notif ke SEMUA admin (Super + Validator). Tiap admin punya row sendiri
 * supaya read state independen. Fire RT.adminNotif per-admin → bell counter naik
 * di client masing-masing.
 */
export async function notifyAdmins(input: NotifInput): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length === 0) return;

    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        meta: input.meta ? (input.meta as object) : undefined,
      })),
    });

    for (const a of admins) {
      RT.adminNotif(a.id).catch(() => {});
    }
  } catch (e) {
    console.error("[notifications] notifyAdmins failed:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Notif ke 1 user spesifik (mis. user dapat balasan feedback).
 */
export async function notifyUser(userId: string, input: NotifInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        meta: input.meta ? (input.meta as object) : undefined,
      },
    });
    RT.adminNotif(userId).catch(() => {});
  } catch (e) {
    console.error("[notifications] notifyUser failed:", e instanceof Error ? e.message : String(e));
  }
}
