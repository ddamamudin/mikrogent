export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptSshPass, decryptSshPass } from "@/lib/crypto";
import { RT } from "@/lib/realtime/events";

async function requireValidatedUser() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") return { error: "Unauthorized" as const, status: 401 };
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, validated: true, maxRouters: true },
  });
  if (!user?.validated) return { error: "Akun belum tervalidasi oleh admin" as const, status: 403 };
  return { userId: user.id, maxRouters: user.maxRouters };
}

export async function GET() {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.mikrotikCredential.findMany({
    where: { userId: auth.userId },
    select: { id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true, apiEnabled: true, apiPort: true, updatedAt: true },
    orderBy: { createdAt: "asc" },
  });
  const routers = rows.map((r) => ({ ...r, sshPass: decryptSshPass(r.sshPass) }));
  return NextResponse.json({ routers, maxRouters: auth.maxRouters });
}

export async function POST(req: NextRequest) {
  const auth = await requireValidatedUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const count = await prisma.mikrotikCredential.count({ where: { userId: auth.userId } });
  if (count >= auth.maxRouters) {
    return NextResponse.json(
      { error: `Sudah mencapai batas ${auth.maxRouters} router. Hubungi admin untuk menambah kuota.` },
      { status: 400 },
    );
  }

  const { name, host, port, sshUser, sshPass } = await req.json();
  if (!host || !sshUser || !sshPass) {
    return NextResponse.json({ error: "Host, username, password wajib diisi" }, { status: 400 });
  }
  const portNum = port !== undefined && port !== null && port !== ""
    ? (typeof port === "number" ? port : parseInt(String(port), 10))
    : 22;
  if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: "Port harus angka 1-65535" }, { status: 400 });
  }

  // Default name: "Router {N}" dengan N sequential berdasarkan count yang ada
  let finalName = String(name ?? "").trim() || `Router ${count + 1}`;
  // Cek bentrok nama dengan router lain milik user yang sama
  const existing = await prisma.mikrotikCredential.findUnique({
    where: { userId_name: { userId: auth.userId, name: finalName } },
  });
  if (existing) {
    // Auto suffix - cari nama berikutnya
    for (let i = count + 2; i <= count + 20; i++) {
      const candidate = `Router ${i}`;
      const dup = await prisma.mikrotikCredential.findUnique({
        where: { userId_name: { userId: auth.userId, name: candidate } },
      });
      if (!dup) { finalName = candidate; break; }
    }
  }

  const created = await prisma.mikrotikCredential.create({
    data: {
      userId: auth.userId,
      name: finalName,
      host: String(host).trim(),
      port: portNum,
      sshUser: String(sshUser).trim(),
      sshPass: encryptSshPass(String(sshPass).trim()),
      connected: false,
    },
    select: { id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true, apiEnabled: true, apiPort: true },
  });

  RT.adminRouterChanged().catch(() => {});
  RT.tenantUpserted(auth.userId).catch(() => {});

  return NextResponse.json({ ok: true, router: { ...created, sshPass: decryptSshPass(created.sshPass) } });
}
