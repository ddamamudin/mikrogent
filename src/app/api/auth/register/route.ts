import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { name, email, brand, alamat, noWa, password } = await req.json();

  if (!name || !email || !brand || !password)
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });

  if (brand.length < 3)
    return NextResponse.json({ error: "Brand minimal 3 karakter" }, { status: 400 });

  if (!/^[a-z0-9-]+$/.test(brand))
    return NextResponse.json({ error: "Brand hanya boleh huruf kecil, angka, dan tanda -" }, { status: 400 });

  if (password.length < 8)
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { brand }] },
  });

  if (existing?.email === email)
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  if (existing?.brand === brand)
    return NextResponse.json({ error: "Brand sudah digunakan" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, brand, alamat: alamat || null, noWa: noWa || null, password: hashed },
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      token,
      type: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(email, name, token);

  return NextResponse.json({ ok: true });
}
