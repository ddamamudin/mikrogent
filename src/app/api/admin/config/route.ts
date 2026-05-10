export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json(config ?? { adminSetupEnabled: true });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (typeof body.adminSetupEnabled === "boolean") {
    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: { adminSetupEnabled: body.adminSetupEnabled },
      create: { id: "singleton", adminSetupEnabled: body.adminSetupEnabled },
    });
    return NextResponse.json(config);
  }

  if (body.newPassword) {
    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: session.userId }, data: { password: hashed } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
}
