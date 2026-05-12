export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pingMikrotikPort } from "@/lib/mikrotik";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { validated: true } });
  if (!user?.validated)
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });

  const { host } = await req.json();
  if (!host) return NextResponse.json({ error: "Host wajib diisi" }, { status: 400 });

  const result = await pingMikrotikPort(String(host).trim(), 22, 5000);
  return NextResponse.json(result);
}
