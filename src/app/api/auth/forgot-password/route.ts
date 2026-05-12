import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: "forgot", ip, limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(rl.resetIn / 60000)} menit.` },
      { status: 429 },
    );
  }

  const body = await req.json();
  const { email, website } = body;

  // Honeypot
  if (website) return NextResponse.json({ ok: true });

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
