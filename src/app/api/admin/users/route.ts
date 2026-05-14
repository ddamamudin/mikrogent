export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin-auth";
import { logAdmin } from "@/lib/admin-log";
import { RT } from "@/lib/realtime/events";

type CreateBody = {
  role: "ADMIN" | "OPERATOR" | "TENANT";
  name: string;
  email: string;
  password: string;
  // Tenant-only:
  brand?: string;
  alamat?: string;
  noWa?: string;
};

// GET — list admin & operator (gak include tenant; tenant punya halaman sendiri).
export async function GET() {
  const admin = await getAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.level === "OPERATOR") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, adminLevel: true, status: true, createdAt: true },
  });

  // Admin gak boleh lihat akun superadmin di list (konsisten dengan policy log).
  const filtered = admin.level === "SUPER" ? users : users.filter((u) => u.adminLevel !== "SUPER");

  return NextResponse.json({ users: filtered.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) });
}

// POST — bikin admin/operator/tenant.
export async function POST(req: NextRequest) {
  const admin = await getAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.level === "OPERATOR")
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const body: CreateBody = await req.json();
  const { role, name, email, password } = body;

  if (!role || !["ADMIN", "OPERATOR", "TENANT"].includes(role))
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  if (!name?.trim() || !email?.trim() || !password)
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });

  const emailLower = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing)
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);

  if (role === "TENANT") {
    const brand = body.brand?.trim() || null;
    if (brand) {
      const brandExists = await prisma.user.findUnique({ where: { brand } });
      if (brandExists) return NextResponse.json({ error: "Brand sudah dipakai" }, { status: 400 });
    }

    // Default kuota router ngikut config global.
    const config = await prisma.appConfig.findUnique({
      where: { id: "singleton" },
      select: { defaultMaxRouters: true },
    });

    const created = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        password: hashed,
        brand,
        alamat: body.alamat?.trim() || null,
        noWa: body.noWa?.trim() || null,
        role: "USER",
        // Tenant yang dibuat manual sama admin/superadmin langsung tervalidasi & verified email.
        emailVerified: true,
        validated: true,
        maxRouters: config?.defaultMaxRouters ?? 1,
      },
      select: { id: true, name: true, email: true },
    });

    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: "create_tenant",
      details: `${created.name} (${created.email})`,
    });
    RT.tenantUpserted(created.id).catch(() => {});

    return NextResponse.json({ ok: true, user: created });
  }

  // Bikin Admin atau Operator.
  const created = await prisma.user.create({
    data: {
      name: name.trim(),
      email: emailLower,
      password: hashed,
      role: "ADMIN",
      adminLevel: role, // "ADMIN" | "OPERATOR"
      emailVerified: true,
    },
    select: { id: true, name: true, email: true, adminLevel: true },
  });

  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: role === "ADMIN" ? "create_admin" : "create_operator",
    details: `${created.name} (${created.email})`,
  });

  return NextResponse.json({ ok: true, user: created });
}
