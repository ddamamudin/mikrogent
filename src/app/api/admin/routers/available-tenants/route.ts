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

  // Hanya tenant yang validated & belum punya kredensial
  const tenants = await prisma.user.findMany({
    where: { role: "USER", validated: true, mikrotikCredential: { is: null } },
    select: { id: true, name: true, email: true, brand: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ tenants });
}
