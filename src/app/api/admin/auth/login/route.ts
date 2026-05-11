export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createSession, sessionCookieOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  if (user.status === "SUSPENDED")
    return NextResponse.json({ error: "Akun Anda telah disuspend" }, { status: 403 });

  const cookieStore = await cookies();
  cookieStore.set("session", createSession(user.id, null, "ADMIN"), sessionCookieOptions());

  return NextResponse.json({ ok: true });
}
