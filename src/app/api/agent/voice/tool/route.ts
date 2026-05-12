export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { executeTool } from "../../chat/tools";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = body?.name;
  const args = body?.arguments;
  if (typeof name !== "string" || !name) {
    return NextResponse.json({ error: "Tool name diperlukan" }, { status: 400 });
  }

  const userId = session.userId;
  const [user, cred] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { validated: true } }),
    prisma.mikrotikCredential.findUnique({ where: { userId } }),
  ]);
  if (!user?.validated) {
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });
  }

  let isConnected = cred?.connected ?? false;
  const ctx = {
    userId,
    isConnected,
    setConnected: (v: boolean) => { isConnected = v; ctx.isConnected = v; },
  };

  const parsedArgs = typeof args === "string"
    ? (() => { try { return JSON.parse(args); } catch { return {}; } })()
    : (args && typeof args === "object" ? args : {});

  const output = await executeTool(name, parsedArgs as Record<string, unknown>, ctx);
  return NextResponse.json({ output });
}
