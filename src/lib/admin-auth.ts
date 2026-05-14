import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type AdminLevel = "SUPER" | "ADMIN" | "OPERATOR";

export type AdminContext = {
  id: string;
  name: string;
  level: AdminLevel;
};

/**
 * Cek session admin dari cookie + fetch adminLevel dari DB.
 * Kembalikan null kalau bukan admin atau session invalid.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") return null;
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, adminLevel: true },
  });
  if (!admin) return null;
  return {
    id: admin.id,
    name: admin.name,
    level: (admin.adminLevel as AdminLevel | null) ?? "SUPER",
  };
}

/** Apakah role boleh aksi yang minimum-nya butuh level X. SUPER > ADMIN > OPERATOR */
export function levelAtLeast(actual: AdminLevel, required: AdminLevel): boolean {
  const rank: Record<AdminLevel, number> = { SUPER: 3, ADMIN: 2, OPERATOR: 1 };
  return rank[actual] >= rank[required];
}
