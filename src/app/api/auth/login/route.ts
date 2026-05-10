import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password)))
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

  if (!user.emailVerified)
    return NextResponse.json({ error: "Email belum dikonfirmasi. Cek inbox Anda." }, { status: 403 });

  if (user.status === "SUSPENDED")
    return NextResponse.json({ error: "Akun Anda telah disuspend" }, { status: 403 });

  // Simple session token
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("session", `${user.id}:${sessionToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".mikroplay.com" : undefined,
  });

  return NextResponse.json({ subdomain: user.subdomain });
}
