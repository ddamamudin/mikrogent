import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  const emailToken = await prisma.emailToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!emailToken || emailToken.expiresAt < new Date() || emailToken.type !== "EMAIL_VERIFICATION")
    return NextResponse.json({ error: "Token tidak valid atau kadaluarsa" }, { status: 400 });

  await prisma.user.update({
    where: { id: emailToken.userId },
    data: { emailVerified: true },
  });

  await prisma.emailToken.delete({ where: { token } });

  const cookieStore = await cookies();
  cookieStore.set("session", createSession(emailToken.user.id, emailToken.user.brand), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    domain: process.env.NODE_ENV === "production" ? `.${process.env.NEXT_PUBLIC_APP_DOMAIN}` : undefined,
  });

  return NextResponse.json({ ok: true });
}
