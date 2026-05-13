import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";
import { notifyNewUser } from "@/lib/fonnte";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function emailToBrand(email: string): string {
  return email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

async function resolveUniqueBrand(base: string): Promise<string> {
  let candidate = base;
  let i = 2;
  while (true) {
    const existing = await prisma.user.findUnique({ where: { brand: candidate } });
    if (!existing) return candidate;
    candidate = `${base}${i}`;
    i++;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit({ key: "register", ip, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(rl.resetIn / 60000)} menit.` },
      { status: 429 },
    );
  }

  const body = await req.json();
  const { name, email, brand: rawBrand, alamat, noWa, password, showBrandField, website } = body;

  // Honeypot - bot dumb auto-fill, manusia gak akan
  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !password)
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });

  if (password.length < 8)
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });

  let brand: string;

  if (showBrandField) {
    if (!rawBrand)
      return NextResponse.json({ error: "Brand wajib diisi" }, { status: 400 });
    if (rawBrand.length < 3)
      return NextResponse.json({ error: "Brand minimal 3 karakter" }, { status: 400 });
    if (!/^[a-z0-9-]+$/.test(rawBrand))
      return NextResponse.json({ error: "Brand hanya boleh huruf kecil, angka, dan tanda -" }, { status: 400 });

    const existingByBrand = await prisma.user.findUnique({ where: { brand: rawBrand } });
    if (existingByBrand)
      return NextResponse.json({ error: "Brand sudah digunakan" }, { status: 400 });

    brand = rawBrand;
  } else {
    const base = emailToBrand(email);
    brand = await resolveUniqueBrand(base);
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail)
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  const config = await prisma.appConfig.findUnique({
    where: { id: "singleton" },
    select: { defaultMaxRouters: true },
  });
  const user = await prisma.user.create({
    data: {
      name, email, brand, alamat: alamat || null, noWa: noWa || null, password: hashed,
      maxRouters: config?.defaultMaxRouters ?? 1,
    },
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

  // Fire-and-forget WA notif ke admin - gak blocking respons
  notifyNewUser({ name, email, brand, noWa }).catch(() => {});

  return NextResponse.json({ ok: true });
}
