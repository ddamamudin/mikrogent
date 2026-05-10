import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { RouterOSAPI } from "@/lib/routeros";
import { decrypt } from "@/lib/encrypt";
import { getSessionFromCookie } from "@/lib/session";

function randomStr(len: number, type: string): string {
  const sets: Record<string, string> = {
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    mixed:     "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    numeric:   "0123456789",
    alpha:     "abcdefghijklmnopqrstuvwxyz0123456789",
  };
  const chars = sets[type] || sets.alpha;
  let result = "";
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export async function POST(req: NextRequest) {
  const {
    subdomain, qty, prefix, length, charType, mode,
    profile, comment, server, limitUptime, limitBytes,
  } = await req.json();

  if (!subdomain || !qty || qty < 1 || qty > 500)
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });

  const session = getSessionFromCookie(req.cookies.get("session")?.value);
  if (!session || session.subdomain !== subdomain)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { subdomain },
    include: { routerConfig: true },
  });
  if (!user?.routerConfig) return NextResponse.json({ error: "Router not configured" }, { status: 404 });

  const { routerIp, apiPort, routerUser, routerPass } = user.routerConfig;

  try {
    const api = new RouterOSAPI(routerIp, apiPort, routerUser, decrypt(routerPass));
    const created: Array<{ name: string; password: string }> = [];
    const nameLen = Math.min(Math.max(Number(length) || 6, 3), 12);

    for (let i = 0; i < qty; i++) {
      const rand = randomStr(nameLen, charType || "alpha");
      const name = (prefix || "") + rand;
      // mode: "vc" = username=password, "up" = separate random password
      const password = mode === "vc" ? name : (prefix || "") + randomStr(nameLen, charType || "alpha");

      const params: Record<string, string> = { name, password };
      if (profile) params.profile = profile;
      if (comment) params.comment = comment;
      if (server) params.server = server;
      if (limitUptime) params["limit-uptime"] = limitUptime;
      if (limitBytes) params["limit-bytes-total"] = limitBytes;

      await api.query("/ip/hotspot/user/add", params);
      created.push({ name, password });
    }

    return NextResponse.json({ ok: true, users: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
