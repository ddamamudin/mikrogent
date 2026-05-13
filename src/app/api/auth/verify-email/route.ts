import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createSession, sessionCookieOptions } from "@/lib/session";
import { RT } from "@/lib/realtime/events";
import { notifyAdmins } from "@/lib/notifications";

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
  cookieStore.set("session", createSession(emailToken.user.id, emailToken.user.brand), sessionCookieOptions());

  // Push ke admin list (badge "Email Belum Verifikasi" ilang)
  RT.tenantUpserted(emailToken.userId).catch(() => {});

  // Bell notif: tenant udah verif email, siap divalidasi admin
  notifyAdmins({
    type: "user_email_verified",
    title: "Email tenant terverifikasi",
    body: `${emailToken.user.name} (${emailToken.user.email}) — siap divalidasi`,
    link: `/admin/tenant/${emailToken.userId}`,
    meta: { tenantId: emailToken.userId },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
