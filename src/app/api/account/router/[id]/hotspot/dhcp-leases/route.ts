export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/dhcp-server/lease/print");
    return {
      leases: (rows as Array<Record<string, unknown>>).map((l) => ({
        id: String(l[".id"] ?? ""),
        address: String(l.address ?? ""),
        macAddress: String(l["mac-address"] ?? ""),
        server: l.server ? String(l.server) : "",
        status: String(l.status ?? ""), // bound | waiting | offered
        dynamic: l.dynamic === "true",
        disabled: l.disabled === "true",
        hostName: l["host-name"] ? String(l["host-name"]) : "",
        clientId: l["client-id"] ? String(l["client-id"]) : "",
        comment: l.comment ? String(l.comment) : "",
        lastSeen: l["last-seen"] ? String(l["last-seen"]) : "",
        expiresAfter: l["expires-after"] ? String(l["expires-after"]) : "",
      })),
    };
  });
}
