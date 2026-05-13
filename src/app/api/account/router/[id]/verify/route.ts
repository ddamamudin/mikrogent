export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { executeMikrotikCommand, scanMikrotikConfig } from "@/lib/mikrotik";
import { decryptSshPass } from "@/lib/crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, validated: true } });
  if (!user?.validated)
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });

  const cred = await prisma.mikrotikCredential.findUnique({ where: { id } });
  if (!cred) return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  if (cred.userId !== user.id) return NextResponse.json({ error: "Router bukan milik Anda" }, { status: 403 });

  const cfg = { host: cred.host, port: cred.port, username: cred.sshUser, password: decryptSshPass(cred.sshPass) };
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
    return NextResponse.json({ ok: true, connected: true });
  } catch (e) {
    await prisma.mikrotikCredential.update({ where: { id }, data: { connected: false } }).catch(() => {});
    return NextResponse.json({ ok: false, connected: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
