export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { executeMikrotikCommand, scanMikrotikConfig } from "@/lib/mikrotik";
import { logAdmin } from "@/lib/admin-log";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, adminLevel: true },
  });
  if (!admin || admin.adminLevel !== "SUPER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cred = await prisma.mikrotikCredential.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!cred) return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });

  const cfg = { host: cred.host, port: cred.port, username: cred.sshUser, password: cred.sshPass };
  try {
    await executeMikrotikCommand("/system identity print", cfg);
    const snapshot = await scanMikrotikConfig(cfg);
    await Promise.all([
      prisma.mikrotikCredential.update({ where: { id }, data: { connected: true } }),
      prisma.agentMemory.upsert({
        where: { credentialId: id },
        update: { content: snapshot },
        create: { credentialId: id, content: snapshot },
      }),
    ]);
    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: "router_verify",
      details: `${cred.user.name} (${cred.user.email}) - ${cred.host}:${cred.port} → SUKSES`,
    });
    return NextResponse.json({ ok: true, connected: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.mikrotikCredential.update({ where: { id }, data: { connected: false } }).catch(() => {});
    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: "router_verify",
      details: `${cred.user.name} (${cred.user.email}) - ${cred.host}:${cred.port} → GAGAL: ${msg}`,
    });
    return NextResponse.json({ ok: false, connected: false, error: msg }, { status: 400 });
  }
}
