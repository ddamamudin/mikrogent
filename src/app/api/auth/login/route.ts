import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createSession, sessionCookieOptions } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/admin-log";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: "login", ip, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(rl.resetIn / 60000)} menit.` },
      { status: 429 },
    );
  }

  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password)))
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

  if (user.status === "SUSPENDED")
    return NextResponse.json({ error: "Akun Anda telah disuspend" }, { status: 403 });

  const isAdmin = user.role === "ADMIN";

  // Admin di-bypass cek emailVerified (di-set true saat akun dibuat manual).
  // User biasa wajib verif email dulu.
  if (!isAdmin && !user.emailVerified)
    return NextResponse.json({ error: "Email belum dikonfirmasi. Cek inbox Anda." }, { status: 403 });

  const cookieStore = await cookies();
  cookieStore.set(
    "session",
    createSession(user.id, user.brand, isAdmin ? "ADMIN" : "USER"),
    sessionCookieOptions(),
  );

  if (isAdmin) {
    await logAdmin({ adminId: user.id, adminName: user.name, action: "login" });
  }

  return NextResponse.json({ ok: true, role: user.role });
}
