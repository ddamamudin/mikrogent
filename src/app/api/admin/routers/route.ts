export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";
import { encryptSshPass, decryptSshPass } from "@/lib/crypto";

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

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const filter = searchParams.get("filter") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;

  // "without_router": list tenant yang belum punya router sama sekali (1 baris per tenant, cred null)
  if (filter === "without_router") {
    const userWhere = {
      role: "USER" as const,
      mikrotikCredentials: { none: {} },
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { brand: { contains: q, mode: "insensitive" as const } },
        ],
      } : {}),
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, email: true, brand: true, maxRouters: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: userWhere }),
    ]);
    const routers = users.map((u) => ({
      userId: u.id, userName: u.name, userEmail: u.email, userBrand: u.brand,
      maxRouters: u.maxRouters, routerCount: 0,
      cred: null,
    }));
    return NextResponse.json({ routers, total, page, totalPages: Math.ceil(total / limit) });
  }

  // Default & filter koneksi: list per credential
  const credWhere = {
    user: { role: "USER" as const },
    ...(filter === "connected" ? { connected: true } : {}),
    ...(filter === "disconnected" ? { connected: false } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { host: { contains: q, mode: "insensitive" as const } },
        { user: { name: { contains: q, mode: "insensitive" as const } } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
        { user: { brand: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [creds, total] = await Promise.all([
    prisma.mikrotikCredential.findMany({
      where: credWhere,
      select: {
        id: true, name: true, host: true, port: true, sshUser: true, sshPass: true, connected: true,
        createdAt: true, updatedAt: true,
        user: { select: { id: true, name: true, email: true, brand: true, maxRouters: true, _count: { select: { mikrotikCredentials: true } } } },
      },
      orderBy: [{ user: { createdAt: "desc" } }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mikrotikCredential.count({ where: credWhere }),
  ]);

  const routers = creds.map((c) => ({
    userId: c.user.id, userName: c.user.name, userEmail: c.user.email, userBrand: c.user.brand,
    maxRouters: c.user.maxRouters, routerCount: c.user._count.mikrotikCredentials,
    cred: {
      id: c.id, name: c.name, host: c.host, port: c.port, sshUser: c.sshUser, sshPass: decryptSshPass(c.sshPass),
      connected: c.connected, createdAt: c.createdAt, updatedAt: c.updatedAt,
    },
  }));

  return NextResponse.json({ routers, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { userId, name, host, port, sshUser, sshPass } = body;

  if (!userId || !host || !sshUser || !sshPass) {
    return NextResponse.json({ error: "userId, host, sshUser, sshPass wajib diisi" }, { status: 400 });
  }
  const portNum = port ? parseInt(String(port), 10) : 22;
  if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: "Port tidak valid" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, role: "USER" },
    select: { name: true, email: true, maxRouters: true, _count: { select: { mikrotikCredentials: true } } },
  });
  if (!user) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  if (user._count.mikrotikCredentials >= user.maxRouters) {
    return NextResponse.json({ error: `Tenant sudah mentok kuota router (${user.maxRouters}). Naikkan dulu di Tenant > Edit.` }, { status: 400 });
  }

  const cleanHost = String(host).trim();
  const cleanUser = String(sshUser).trim();
  const cleanPass = String(sshPass).trim();
  let finalName = String(name ?? "").trim() || `Router ${user._count.mikrotikCredentials + 1}`;

  // Cek bentrok nama
  const dup = await prisma.mikrotikCredential.findUnique({
    where: { userId_name: { userId, name: finalName } },
  });
  if (dup) {
    for (let i = user._count.mikrotikCredentials + 2; i <= user._count.mikrotikCredentials + 20; i++) {
      const candidate = `Router ${i}`;
      const exists = await prisma.mikrotikCredential.findUnique({
        where: { userId_name: { userId, name: candidate } },
      });
      if (!exists) { finalName = candidate; break; }
    }
  }

  await prisma.mikrotikCredential.create({
    data: { userId, name: finalName, host: cleanHost, port: portNum, sshUser: cleanUser, sshPass: encryptSshPass(cleanPass), connected: false },
  });

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "router_create",
    details: `${user.name} (${user.email}) [${finalName}] → ${cleanHost}:${portNum} as ${cleanUser}`,
  });

  return NextResponse.json({ ok: true });
}
