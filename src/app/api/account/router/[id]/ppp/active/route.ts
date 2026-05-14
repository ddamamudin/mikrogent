export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ppp/active/print");
    return {
      active: (rows as Array<Record<string, unknown>>).map((a) => ({
        id: String(a[".id"] ?? ""),
        name: String(a.name ?? ""),
        service: String(a.service ?? ""),
        callerId: a["caller-id"] ? String(a["caller-id"]) : "",
        address: a.address ? String(a.address) : "",
        uptime: a.uptime ? String(a.uptime) : "",
        encoding: a.encoding ? String(a.encoding) : "",
        sessionId: a["session-id"] ? String(a["session-id"]) : "",
      })),
    };
  });
}
