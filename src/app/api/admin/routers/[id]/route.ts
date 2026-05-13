export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";
import { encryptSshPass } from "@/lib/crypto";
import { RT } from "@/lib/realtime/events";

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
  return c ? `${c.user.name} (${c.user.email}) - ${c.host}` : credId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  // Cek nama: kalau berubah, validasi tidak bentrok di user yang sama
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: "Nama router tidak boleh kosong" }, { status: 400 });
    const current = await prisma.mikrotikCredential.findUnique({ where: { id }, select: { userId: true, name: true } });
    if (!current) return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
    if (trimmed !== current.name) {
      const dup = await prisma.mikrotikCredential.findUnique({
        where: { userId_name: { userId: current.userId, name: trimmed } },
      });
      if (dup) return NextResponse.json({ error: "Nama router sudah dipakai tenant ini" }, { status: 400 });
      data.name = trimmed;
    }
  }

  if (typeof body.host === "string") data.host = body.host.trim();
  if (body.port !== undefined) {
    const p = parseInt(String(body.port), 10);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return NextResponse.json({ error: "Port tidak valid" }, { status: 400 });
    data.port = p;
  }
  if (typeof body.sshUser === "string") data.sshUser = body.sshUser.trim();
  if (typeof body.sshPass === "string") data.sshPass = encryptSshPass(body.sshPass.trim());

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });

  // Kalau ada perubahan kredensial koneksi, reset connected supaya wajib verify ulang
  if ("host" in data || "port" in data || "sshUser" in data || "sshPass" in data) {
    data.connected = false;
  }

  const label = await credLabel(id);
  let userId: string | null = null;
  try {
    const updated = await prisma.mikrotikCredential.update({ where: { id }, data, select: { userId: true } });
    userId = updated.userId;
  } catch {
    return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  }

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "router_update",
    details: label,
  });
  if (userId) {
    RT.adminRouterChanged().catch(() => {});
    RT.tenantUpserted(userId).catch(() => {});
    RT.userRouterChanged(userId).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const label = await credLabel(id);

  let userId: string | null = null;
  try {
    const deleted = await prisma.mikrotikCredential.delete({ where: { id }, select: { userId: true } });
    userId = deleted.userId;
  } catch {
    return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  }

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "router_delete",
    details: label,
  });
  if (userId) {
    RT.adminRouterChanged().catch(() => {});
    RT.tenantUpserted(userId).catch(() => {});
    RT.userRouterChanged(userId).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
