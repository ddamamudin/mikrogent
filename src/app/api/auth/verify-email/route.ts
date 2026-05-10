import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({ subdomain: emailToken.user.subdomain });
}
