export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireValidatedUser() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return { error: "Unauthorized" as const, status: 401 };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, validated: true } });
  if (!user?.validated) return { error: "Akun belum tervalidasi oleh admin" as const, status: 403 };
  return { userId: user.id };
}

export async function GET() {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const cred = await prisma.mikrotikCredential.findUnique({
    where: { userId: auth.userId },
    select: { host: true, port: true, sshUser: true, sshPass: true, connected: true, updatedAt: true },
  });
  return NextResponse.json({ cred });
}

export async function POST(req: NextRequest) {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { host, port, sshUser, sshPass } = await req.json();
  if (!host || !sshUser || !sshPass) {
    return NextResponse.json({ error: "Host, username, password wajib diisi" }, { status: 400 });
  }
  const portNum = port !== undefined && port !== null && port !== ""
    ? (typeof port === "number" ? port : parseInt(String(port), 10))
    : 22;
  if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: "Port harus angka 1-65535" }, { status: 400 });
  }

  await prisma.mikrotikCredential.upsert({
    where: { userId: auth.userId },
    update: { host: String(host).trim(), port: portNum, sshUser: String(sshUser).trim(), sshPass: String(sshPass).trim(), connected: false },
    create: { userId: auth.userId, host: String(host).trim(), port: portNum, sshUser: String(sshUser).trim(), sshPass: String(sshPass).trim(), connected: false },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.mikrotikCredential.deleteMany({ where: { userId: auth.userId } });
  await prisma.agentMemory.deleteMany({ where: { userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
