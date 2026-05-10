import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { RouterOSAPI } from "@/lib/routeros";
import { decrypt } from "@/lib/encrypt";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");
  const cmd = req.nextUrl.searchParams.get("cmd") || "dashboard";

  if (!subdomain) return NextResponse.json({ error: "Missing subdomain" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { subdomain },
    include: { routerConfig: true },
  });

  if (!user?.routerConfig) return NextResponse.json({ error: "Router not configured" }, { status: 404 });

  const { routerIp, apiPort, routerUser, routerPass } = user.routerConfig;

  try {
    const api = new RouterOSAPI(routerIp, apiPort, routerUser, decrypt(routerPass));

    if (cmd === "dashboard") {
      const [resource, identity, hotspotUsers, activeUsers] = await Promise.all([
        api.query("/system/resource/print"),
        api.query("/system/identity/print"),
        api.query("/ip/hotspot/user/print"),
        api.query("/ip/hotspot/active/print"),
      ]);

      const res = resource[0] || {};
      const cpuLoad = Number(res["cpu-load"] || 0);
      const totalMem = Number(res["total-memory"] || 0);
      const freeMem = Number(res["free-memory"] || 0);
      const usedMem = totalMem - freeMem;
      const memPercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

      return NextResponse.json({
        routerName: identity[0]?.["name"] || routerIp,
        routerIp,
        uptime: res["uptime"] || "-",
        version: res["version"] || "-",
        cpuLoad,
        memPercent,
        totalMemMB: Math.round(totalMem / 1024 / 1024),
        usedMemMB: Math.round(usedMem / 1024 / 1024),
        totalUsers: hotspotUsers.length,
        activeUsers: activeUsers.length,
      });
    }

    if (cmd === "users") {
      const profile = req.nextUrl.searchParams.get("profile") || "";
      const users = await api.query("/ip/hotspot/user/print");
      return NextResponse.json(profile ? users.filter((u) => u["profile"] === profile) : users);
    }

    if (cmd === "active") {
      const active = await api.query("/ip/hotspot/active/print");
      return NextResponse.json(active);
    }

    if (cmd === "profiles") {
      const profiles = await api.query("/ip/hotspot/user/profile/print");
      return NextResponse.json(profiles);
    }

    return NextResponse.json({ error: "Unknown command" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
