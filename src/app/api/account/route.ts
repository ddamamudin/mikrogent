import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSessionFromCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");
  if (!subdomain) return NextResponse.json({ error: "Missing subdomain" }, { status: 400 });

  const session = getSessionFromCookie(req.cookies.get("session")?.value);
  if (!session || session.subdomain !== subdomain)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { subdomain },
    select: { name: true, email: true, subdomain: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const { subdomain, name, currentPassword, newPassword } = await req.json();

  const session = getSessionFromCookie(req.cookies.get("session")?.value);
  if (!session || session.subdomain !== subdomain)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { subdomain } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const updates: Record<string, string> = {};
  if (name && name !== user.name) updates.name = name;

  if (newPassword) {
    if (!currentPassword)
      return NextResponse.json({ error: "Password lama diperlukan" }, { status: 400 });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok)
      return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
    updates.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });

  await prisma.user.update({ where: { subdomain }, data: updates });
  return NextResponse.json({ ok: true });
}
