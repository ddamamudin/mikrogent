export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin-auth";
import { logAdmin } from "@/lib/admin-log";

// DELETE — hapus admin/operator. Superadmin gak boleh dihapus dari sini.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.level === "OPERATOR")
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, adminLevel: true },
  });
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (target.role !== "ADMIN")
    return NextResponse.json({ error: "Hanya admin/operator yang bisa dihapus lewat sini" }, { status: 400 });
  if (target.id === admin.id)
    return NextResponse.json({ error: "Gak bisa hapus akun sendiri" }, { status: 400 });
  if (target.adminLevel === "SUPER")
    return NextResponse.json({ error: "Superadmin tidak bisa dihapus dari UI" }, { status: 403 });
  if (admin.level === "ADMIN" && target.adminLevel === "ADMIN")
    return NextResponse.json({ error: "Admin gak bisa hapus sesama admin" }, { status: 403 });

  await prisma.user.delete({ where: { id } });
  await logAdmin({
    adminId: admin.id, adminName: admin.name,
    action: target.adminLevel === "ADMIN" ? "delete_admin" : "delete_operator",
    details: `${target.name} (${target.email})`,
  });
  return NextResponse.json({ ok: true });
}

// PATCH — reset password admin/operator.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.level === "OPERATOR")
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, adminLevel: true },
  });
  if (!target) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (target.role !== "ADMIN")
    return NextResponse.json({ error: "Endpoint ini hanya untuk admin/operator" }, { status: 400 });
  if (target.adminLevel === "SUPER" && target.id !== admin.id)
    return NextResponse.json({ error: "Superadmin tidak bisa diubah dari sini" }, { status: 403 });
  if (admin.level === "ADMIN" && target.adminLevel === "ADMIN" && target.id !== admin.id)
    return NextResponse.json({ error: "Admin gak bisa reset password sesama admin" }, { status: 403 });

  if (typeof body.password === "string") {
    if (body.password.length < 8)
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    const hashed = await bcrypt.hash(body.password, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: "reset_user_password",
      details: `${target.name} (${target.email})`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
}
