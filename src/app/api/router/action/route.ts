import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { RouterOSAPI } from "@/lib/routeros";
import { decrypt } from "@/lib/encrypt";

export async function POST(req: NextRequest) {
  const { subdomain, action, params } = await req.json();

  const user = await prisma.user.findUnique({
    where: { subdomain },
    include: { routerConfig: true },
  });

  if (!user?.routerConfig) return NextResponse.json({ error: "Router not configured" }, { status: 404 });

  const { routerIp, apiPort, routerUser, routerPass } = user.routerConfig;

  try {
    const api = new RouterOSAPI(routerIp, apiPort, routerUser, decrypt(routerPass));

    // Special: batch remove expired users (limit-uptime=1s)
    if (action === "remove-expired") {
      const expired = await api.query("/ip/hotspot/user/print", { "?limit-uptime": "1s" });
      for (const u of expired) await api.query("/ip/hotspot/user/remove", { ".id": u[".id"] });
      return NextResponse.json({ ok: true, removed: expired.length });
    }

    const actionMap: Record<string, string> = {
      // Hotspot users
      "add-user":           "/ip/hotspot/user/add",
      "remove-user":        "/ip/hotspot/user/remove",
      "enable-user":        "/ip/hotspot/user/enable",
      "disable-user":       "/ip/hotspot/user/disable",
      "edit-user":          "/ip/hotspot/user/set",
      "reset-user":         "/ip/hotspot/user/reset",
      // Active sessions
      "remove-active":      "/ip/hotspot/active/remove",
      // Profiles
      "add-profile":        "/ip/hotspot/user/profile/add",
      "edit-profile":       "/ip/hotspot/user/profile/set",
      "remove-profile":     "/ip/hotspot/user/profile/remove",
      // Hosts
      "remove-host":        "/ip/hotspot/host/remove",
      // IP Binding
      "add-ipbinding":      "/ip/hotspot/ip-binding/add",
      "enable-ipbinding":   "/ip/hotspot/ip-binding/enable",
      "disable-ipbinding":  "/ip/hotspot/ip-binding/disable",
      "remove-ipbinding":   "/ip/hotspot/ip-binding/remove",
      // Cookies
      "remove-cookie":      "/ip/hotspot/cookie/remove",
      // Scripts (Quick Print)
      "add-script":         "/system/script/add",
      "edit-script":        "/system/script/set",
      "remove-script":      "/system/script/remove",
      // Scheduler
      "enable-scheduler":   "/system/scheduler/enable",
      "disable-scheduler":  "/system/scheduler/disable",
      "remove-scheduler":   "/system/scheduler/remove",
      // PPP
      "enable-ppp-secret":  "/ppp/secret/enable",
      "disable-ppp-secret": "/ppp/secret/disable",
      "remove-ppp-secret":  "/ppp/secret/remove",
      "add-ppp-secret":     "/ppp/secret/add",
      "edit-ppp-secret":    "/ppp/secret/set",
      "disconnect-ppp":     "/ppp/active/remove",
      "add-ppp-profile":    "/ppp/profile/add",
      "edit-ppp-profile":   "/ppp/profile/set",
      "remove-ppp-profile": "/ppp/profile/remove",
      // System
      "reboot":             "/system/reboot",
    };

    const cmd = actionMap[action];
    if (!cmd) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    const result = await api.query(cmd, params || {});
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
