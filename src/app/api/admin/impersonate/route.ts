export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getSessionFromCookie,
  createSession,
  createImpersonatorToken,
  verifyImpersonatorToken,
  sessionCookieOptions,
  IMPERSONATOR_COOKIE_MAX_AGE,
} from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";

// Mulai impersonate
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, adminLevel: true },
  });
  if (!admin || admin.adminLevel !== "SUPER")
    return NextResponse.json({ error: "Hanya superadmin yang bisa impersonate" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, brand: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Target tidak ditemukan" }, { status: 404 });
  if (target.role !== "USER")
    return NextResponse.json({ error: "Tidak bisa impersonate admin lain" }, { status: 400 });

  // Simpan kredensial admin di cookie impersonator
  const impToken = createImpersonatorToken({
    adminId: admin.id,
    adminName: admin.name,
    targetUserId: target.id,
    targetUserName: target.name,
  });
  const baseOpts = sessionCookieOptions();
  cookieStore.set("impersonator", impToken, { ...baseOpts, maxAge: IMPERSONATOR_COOKIE_MAX_AGE });

  // Ganti session jadi punya target user
  cookieStore.set("session", createSession(target.id, target.brand, "USER"), baseOpts);

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "impersonate_start",
    details: `${target.name} (${target.email})`,
  });

  return NextResponse.json({ ok: true });
}

// Keluar dari impersonate, restore session admin
export async function DELETE() {
  const cookieStore = await cookies();
  const imp = verifyImpersonatorToken(cookieStore.get("impersonator")?.value);
  if (!imp) return NextResponse.json({ error: "Tidak sedang impersonate" }, { status: 400 });

  const admin = await prisma.user.findUnique({
    where: { id: imp.adminId },
    select: { id: true, name: true, role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    // Admin asli sudah ngga ada / bukan admin lagi → tetap clear cookie supaya gak stuck
    cookieStore.set("impersonator", "", { ...sessionCookieOptions(), maxAge: 0 });
    cookieStore.set("session", "", { ...sessionCookieOptions(), maxAge: 0 });
    return NextResponse.json({ ok: true, redirect: "/admin/masuk" });
  }

  cookieStore.set("session", createSession(admin.id, null, "ADMIN"), sessionCookieOptions());
  cookieStore.set("impersonator", "", { ...sessionCookieOptions(), maxAge: 0 });

  await logAdmin({
    adminId: imp.adminId, adminName: imp.adminName,
    action: "impersonate_end",
    details: `${imp.targetUserName}`,
  });

  return NextResponse.json({ ok: true, redirect: "/admin/router" });
}
