export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") return null;
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, adminLevel: true },
  });
  if (!admin || admin.adminLevel !== "SUPER") return null;
  return admin;
}

async function credLabel(credId: string): Promise<string> {
  const c = await prisma.mikrotikCredential.findUnique({
    where: { id: credId },
    select: { host: true, user: { select: { name: true, email: true } } },
  });
  return c ? `${c.user.name} (${c.user.email}) — ${c.host}` : credId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.host !== undefined) data.host = String(body.host);
  if (body.port !== undefined) {
    const p = parseInt(String(body.port), 10);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return NextResponse.json({ error: "Port tidak valid" }, { status: 400 });
    data.port = p;
  }
  if (body.sshUser !== undefined) data.sshUser = String(body.sshUser);
  if (body.sshPass !== undefined) data.sshPass = String(body.sshPass);

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });

  // Setelah kred berubah, reset connected
  data.connected = false;

  const label = await credLabel(id);
  try {
    await prisma.mikrotikCredential.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  }

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "router_update",
    details: label,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const label = await credLabel(id);

  try {
    await prisma.mikrotikCredential.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  }

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "router_delete",
    details: label,
  });
  return NextResponse.json({ ok: true });
}
