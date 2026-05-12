export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") return null;
  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true } });
  if (!admin) return null;
  return admin;
}

async function tenantLabel(id: string): Promise<string> {
  const t = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
  return t ? `${t.name} (${t.email})` : id;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const today = new Date().toISOString().slice(0, 10);
  const [tenant, config] = await Promise.all([
    prisma.user.findUnique({
      where: { id, role: "USER" },
      select: {
        id: true, name: true, email: true, brand: true, alamat: true, noWa: true,
        status: true, emailVerified: true, validated: true, dailyChatLimit: true,
        createdAt: true, updatedAt: true,
        agentDailyCount: { select: { count: true, date: true } },
      },
    }),
    prisma.appConfig.findUnique({ where: { id: "singleton" }, select: { dailyChatLimit: true } }),
  ]);
  if (!tenant) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  const { agentDailyCount, dailyChatLimit: userOverride, ...rest } = tenant;
  const globalLimit = config?.dailyChatLimit ?? 50;
  return NextResponse.json({
    ...rest,
    chatCount: agentDailyCount?.date === today ? (agentDailyCount.count ?? 0) : 0,
    userDailyChatLimit: userOverride,
    globalDailyChatLimit: globalLimit,
    dailyChatLimit: userOverride ?? globalLimit,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const label = await tenantLabel(id);

  if (body.action === "resetChatQuota") {
    await prisma.agentDailyCount.deleteMany({ where: { userId: id } });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "reset_chat_quota", details: label });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.validated === "boolean") {
    const tenant = await prisma.user.updateMany({
      where: { id, role: "USER" },
      data: { validated: body.validated },
    });
    if (tenant.count === 0) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: body.validated ? "validate_tenant" : "unvalidate_tenant",
      details: label,
    });
    return NextResponse.json({ ok: true });
  }

  if ("dailyChatLimit" in body) {
    const v = body.dailyChatLimit;
    let value: number | null;
    if (v === null || v === "") {
      value = null;
    } else {
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "Limit chat tidak valid" }, { status: 400 });
      value = n;
    }
    const tenant = await prisma.user.updateMany({
      where: { id, role: "USER" },
      data: { dailyChatLimit: value },
    });
    if (tenant.count === 0) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: "set_chat_limit",
      details: `${label} → ${value === null ? "default global" : `${value}/hari`}`,
    });
    return NextResponse.json({ ok: true });
  }

  const { status } = body;
  if (status !== "ACTIVE" && status !== "SUSPENDED")
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const tenant = await prisma.user.updateMany({
    where: { id, role: "USER" },
    data: { status },
  });
  if (tenant.count === 0) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: status === "ACTIVE" ? "activate_tenant" : "suspend_tenant",
    details: label,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const label = await tenantLabel(id);
  const deleted = await prisma.user.deleteMany({ where: { id, role: "USER" } });
  if (deleted.count === 0) return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
  await logAdmin({ adminId: admin.id, adminName: admin.name, action: "delete_tenant", details: label });
  return NextResponse.json({ ok: true });
}
