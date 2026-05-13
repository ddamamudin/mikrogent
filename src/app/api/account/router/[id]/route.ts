export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptSshPass, decryptSshPass } from "@/lib/crypto";

async function requireOwnership(id: string) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return { error: "Unauthorized" as const, status: 401 };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, validated: true } });
  if (!user?.validated) return { error: "Akun belum tervalidasi oleh admin" as const, status: 403 };
  const cred = await prisma.mikrotikCredential.findUnique({ where: { id } });
  if (!cred) return { error: "Router tidak ditemukan" as const, status: 404 };
  if (cred.userId !== user.id) return { error: "Router bukan milik Anda" as const, status: 403 };
  return { userId: user.id, cred };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOwnership(id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { name, host, port, sshUser, sshPass } = body;

  // Build update object - tiap field optional
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (typeof name === "string") {
    const trimmed = name.trim();
    if (!trimmed) return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    if (trimmed !== auth.cred.name) {
      const dup = await prisma.mikrotikCredential.findUnique({
        where: { userId_name: { userId: auth.userId, name: trimmed } },
      });
      if (dup) return NextResponse.json({ error: "Nama router sudah dipakai" }, { status: 400 });
      data.name = trimmed;
    }
  }
  if (typeof host === "string") data.host = host.trim();
  if (port !== undefined) {
    const portNum = typeof port === "number" ? port : parseInt(String(port), 10);
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json({ error: "Port harus angka 1-65535" }, { status: 400 });
    }
    data.port = portNum;
  }
  if (typeof sshUser === "string") data.sshUser = sshUser.trim();
  if (typeof sshPass === "string") data.sshPass = encryptSshPass(sshPass.trim());

  // Kalau kredensial koneksi berubah, reset status connected supaya user wajib verify ulang
  if (data.host !== undefined || data.port !== undefined || data.sshUser !== undefined || data.sshPass !== undefined) {
    data.connected = false;
  }

  const updated = await prisma.mikrotikCredential.update({
    where: { id },
    data,
    select: { id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true },
  });
  return NextResponse.json({ ok: true, router: { ...updated, sshPass: decryptSshPass(updated.sshPass) } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOwnership(id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Cascade akan menghapus AgentMemory; activeCredentialId di session di-SET NULL
  await prisma.mikrotikCredential.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
