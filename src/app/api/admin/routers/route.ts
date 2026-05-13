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

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const filter = searchParams.get("filter") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;

  const where = {
    role: "USER" as const,
    ...(filter === "with_router" ? { mikrotikCredential: { is: { connected: { not: undefined } } } } : {}),
    ...(filter === "without_router" ? { mikrotikCredential: { is: null } } : {}),
    ...(filter === "connected" ? { mikrotikCredential: { is: { connected: true } } } : {}),
    ...(filter === "disconnected" ? { mikrotikCredential: { is: { connected: false } } } : {}),
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { brand: { contains: q, mode: "insensitive" as const } },
        { mikrotikCredential: { is: { host: { contains: q, mode: "insensitive" as const } } } },
      ],
    } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, brand: true,
        mikrotikCredential: {
          select: { id: true, host: true, port: true, sshUser: true, sshPass: true, connected: true, createdAt: true, updatedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const routers = users.map((u) => ({
    userId: u.id,
    userName: u.name,
    userEmail: u.email,
    userBrand: u.brand,
    cred: u.mikrotikCredential,
  }));

  return NextResponse.json({
    routers, total, page, totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { userId, host, port, sshUser, sshPass } = body;

  if (!userId || !host || !sshUser || !sshPass) {
    return NextResponse.json({ error: "userId, host, sshUser, sshPass wajib diisi" }, { status: 400 });
  }
  const portNum = port ? parseInt(String(port), 10) : 22;
  if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: "Port tidak valid" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId, role: "USER" }, select: { name: true, email: true } });
  if (!user) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });

  const cleanHost = String(host).trim();
  const cleanUser = String(sshUser).trim();
  const cleanPass = String(sshPass).trim();

  await prisma.mikrotikCredential.upsert({
    where: { userId },
    update: { host: cleanHost, port: portNum, sshUser: cleanUser, sshPass: cleanPass, connected: false },
    create: { userId, host: cleanHost, port: portNum, sshUser: cleanUser, sshPass: cleanPass, connected: false },
  });

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: "router_create",
    details: `${user.name} (${user.email}) → ${cleanHost}:${portNum} as ${cleanUser}`,
  });

  return NextResponse.json({ ok: true });
}
