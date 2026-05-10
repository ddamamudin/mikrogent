export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.adminSetupEnabled) {
    return NextResponse.json({ error: "Setup admin dinonaktifkan" }, { status: 403 });
  }

  const { name, email, password } = await req.json();
  if (!name || !email || !password)
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: { name, email, password: hashed, role: "ADMIN", emailVerified: true },
  });

  const cookieStore = await cookies();
  cookieStore.set("session", createSession(admin.id, null, "ADMIN"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    domain: process.env.NODE_ENV === "production" ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}` : undefined,
  });

  return NextResponse.json({ ok: true });
}
