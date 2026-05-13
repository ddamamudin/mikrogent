export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { adminLevel: true },
  });
  if (admin?.adminLevel !== "SUPER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Tenant validated yang count router < maxRouters
  const users = await prisma.user.findMany({
    where: { role: "USER", validated: true },
    select: {
      id: true, name: true, email: true, brand: true, maxRouters: true,
      _count: { select: { mikrotikCredentials: true } },
    },
    orderBy: { name: "asc" },
  });
  const tenants = users
    .filter((u) => u._count.mikrotikCredentials < u.maxRouters)
    .map((u) => ({
      id: u.id, name: u.name, email: u.email, brand: u.brand,
      maxRouters: u.maxRouters, routerCount: u._count.mikrotikCredentials,
    }));

  return NextResponse.json({ tenants });
}
