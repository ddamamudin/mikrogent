export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tenant = await prisma.user.findUnique({
    where: { id, role: "USER" },
    select: { id: true, name: true, email: true, brand: true, alamat: true, noWa: true, status: true, emailVerified: true, createdAt: true, updatedAt: true },
  });
  if (!tenant) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json();
  if (status !== "ACTIVE" && status !== "SUSPENDED")
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const tenant = await prisma.user.updateMany({
    where: { id, role: "USER" },
    data: { status },
  });
  if (tenant.count === 0) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const deleted = await prisma.user.deleteMany({ where: { id, role: "USER" } });
  if (deleted.count === 0) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
