export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/hotspot/active/print");
    return {
      active: (rows as Array<Record<string, unknown>>).map((u) => ({
        id: String(u[".id"] ?? ""),
        user: String(u.user ?? ""),
        address: String(u.address ?? ""),
        macAddress: String(u["mac-address"] ?? ""),
        uptime: String(u.uptime ?? ""),
        sessionTimeLeft: u["session-time-left"] ? String(u["session-time-left"]) : "",
        bytesIn: String(u["bytes-in"] ?? "0"),
        bytesOut: String(u["bytes-out"] ?? "0"),
        loginBy: u["login-by"] ? String(u["login-by"]) : "",
        server: u.server ? String(u.server) : "",
      })),
    };
  });
}
