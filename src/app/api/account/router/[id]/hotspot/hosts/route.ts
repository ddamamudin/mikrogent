export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Hotspot host = device yang ke-detect di hotspot network (entah authenticated
// atau gak). Beda dari /ip/hotspot/active (yang authenticated saja).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/hotspot/host/print");
    return {
      hosts: (rows as Array<Record<string, unknown>>).map((h) => ({
        id: String(h[".id"] ?? ""),
        macAddress: String(h["mac-address"] ?? ""),
        address: String(h.address ?? ""),
        toAddress: h["to-address"] ? String(h["to-address"]) : "",
        server: h.server ? String(h.server) : "",
        uptime: h.uptime ? String(h.uptime) : "",
        idleTime: h["idle-time"] ? String(h["idle-time"]) : "",
        bytesIn: h["bytes-in"] ? String(h["bytes-in"]) : "0",
        bytesOut: h["bytes-out"] ? String(h["bytes-out"]) : "0",
        authorized: h.authorized === "true",
        bypassed: h.bypassed === "true",
        dhcp: h["DHCP"] === "true" || h.dhcp === "true",
        host: h.host ? String(h.host) : "",
        comment: h.comment ? String(h.comment) : "",
      })),
    };
  });
}
