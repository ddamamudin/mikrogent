import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });

  // Selalu return ok untuk menghindari email enumeration
  if (!user) return NextResponse.json({ ok: true });

  // Hapus token reset lama jika ada
  await prisma.emailToken.deleteMany({
    where: { userId: user.id, type: "PASSWORD_RESET" },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      token,
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 jam
    },
  });

  await sendPasswordResetEmail(email, user.name, token);

  return NextResponse.json({ ok: true });
}
