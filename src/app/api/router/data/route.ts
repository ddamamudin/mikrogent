import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { RouterOSAPI } from "@/lib/routeros";
import { decrypt } from "@/lib/encrypt";
import { getSessionFromCookie } from "@/lib/session";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");
  const cmd = req.nextUrl.searchParams.get("cmd") || "dashboard";

  if (!subdomain) return NextResponse.json({ error: "Missing subdomain" }, { status: 400 });

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

    if (cmd === "active") return NextResponse.json(await api.query("/ip/hotspot/active/print"));
    if (cmd === "profiles") return NextResponse.json(await api.query("/ip/hotspot/user/profile/print"));
    if (cmd === "servers") return NextResponse.json(await api.query("/ip/hotspot/print"));

    if (cmd === "hosts") {
      const filter = req.nextUrl.searchParams.get("filter") || "";
      const params: Record<string, string> = {};
      if (filter === "authorized") params["?authorized"] = "yes";
      if (filter === "bypassed") params["?bypassed"] = "yes";
      return NextResponse.json(await api.query("/ip/hotspot/host/print", params));
    }

    if (cmd === "ipbinding") return NextResponse.json(await api.query("/ip/hotspot/ip-binding/print"));
    if (cmd === "cookies") return NextResponse.json(await api.query("/ip/hotspot/cookie/print"));
    if (cmd === "dhcp") return NextResponse.json(await api.query("/ip/dhcp-server/lease/print"));

    if (cmd === "logs") {
      const logs = await api.query("/log/print", { "?topics": "hotspot" });
      return NextResponse.json([...logs].reverse().slice(0, 200));
    }

    if (cmd === "interfaces") return NextResponse.json(await api.query("/interface/print"));

    if (cmd === "traffic") {
      const iface = req.nextUrl.searchParams.get("iface") || "ether1";
      const stats = await api.query("/interface/monitor-traffic", { interface: iface, once: "" });
      return NextResponse.json(stats[0] || {});
    }

    if (cmd === "scheduler") return NextResponse.json(await api.query("/system/scheduler/print"));

    if (cmd === "scripts") {
      const comment = req.nextUrl.searchParams.get("comment") || "mikhmon";
      const owner   = req.nextUrl.searchParams.get("owner") || "";
      const params: Record<string, string> = {
        "?comment": comment,
        ".proplist": ".id,name,comment,owner",
      };
      if (owner) params["?owner"] = owner;
      return NextResponse.json(await api.query("/system/script/print", params));
    }

    if (cmd === "scripts-all") {
      const all = await api.query("/system/script/print", { ".proplist": ".id,name,comment" });
      return NextResponse.json(all.slice(0, 100));
    }

    if (cmd === "quickprint") {
      return NextResponse.json(await api.query("/system/script/print", { "?comment": "QuickPrintMikhmon" }));
    }

    // PPP
    if (cmd === "ppp-secrets")  return NextResponse.json(await api.query("/ppp/secret/print"));
    if (cmd === "ppp-active")   return NextResponse.json(await api.query("/ppp/active/print"));
    if (cmd === "ppp-profiles") return NextResponse.json(await api.query("/ppp/profile/print"));

    return NextResponse.json({ error: "Unknown command" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
