import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password)
    return NextResponse.json({ error: "Token dan password wajib diisi" }, { status: 400 });

  if (password.length < 8)
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });

  const emailToken = await prisma.emailToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!emailToken || emailToken.expiresAt < new Date() || emailToken.type !== "PASSWORD_RESET")
    return NextResponse.json({ error: "Token tidak valid atau kadaluarsa" }, { status: 400 });

  await prisma.user.update({
    where: { id: emailToken.userId },
    data: { password: await bcrypt.hash(password, 12) },
  });

  await prisma.emailToken.delete({ where: { token } });

  return NextResponse.json({ ok: true });
}
