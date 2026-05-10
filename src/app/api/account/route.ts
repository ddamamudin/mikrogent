import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSessionFromCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = getSessionFromCookie(req.cookies.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, brand: true, alamat: true, noWa: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = getSessionFromCookie(req.cookies.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, alamat, noWa, currentPassword, newPassword } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const updates: Record<string, string | null> = {};
  if (name !== undefined && name !== user.name) updates.name = name;
  if (alamat !== undefined) updates.alamat = alamat || null;
  if (noWa !== undefined) updates.noWa = noWa || null;

  if (newPassword) {
    if (!currentPassword)
      return NextResponse.json({ error: "Password lama diperlukan" }, { status: 400 });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok)
      return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
    if (newPassword.length < 8)
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    updates.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });

  await prisma.user.update({ where: { id: session.userId }, data: updates });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = getSessionFromCookie(req.cookies.get("session")?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  if (user.email !== email)
    return NextResponse.json({ error: "Email tidak sesuai" }, { status: 400 });

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk)
    return NextResponse.json({ error: "Password salah" }, { status: 400 });

  await prisma.user.delete({ where: { id: session.userId } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { maxAge: 0, path: "/" });
  return res;
}
