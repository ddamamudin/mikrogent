export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { executeMikrotikCommand, scanMikrotikConfig } from "@/lib/mikrotik";

export async function POST() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { validated: true } });
  if (!user?.validated)
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });

  const cred = await prisma.mikrotikCredential.findUnique({ where: { userId: session.userId } });
  if (!cred) return NextResponse.json({ error: "Kredensial belum diisi" }, { status: 400 });

  const cfg = { host: cred.host, port: cred.port, username: cred.sshUser, password: cred.sshPass };
  try {
    await executeMikrotikCommand("/system identity print", cfg);
    const snapshot = await scanMikrotikConfig(cfg);
    await Promise.all([
      prisma.mikrotikCredential.update({ where: { userId: session.userId }, data: { connected: true } }),
      prisma.agentMemory.upsert({
        where: { userId: session.userId },
        update: { content: snapshot },
        create: { userId: session.userId, content: snapshot },
      }),
    ]);
    return NextResponse.json({ ok: true, connected: true });
  } catch (e) {
    await prisma.mikrotikCredential.update({ where: { userId: session.userId }, data: { connected: false } }).catch(() => {});
    return NextResponse.json({ ok: false, connected: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
