export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/hotspot/ip-binding/print");
    return {
      bindings: (rows as Array<Record<string, unknown>>).map((b) => ({
        id: String(b[".id"] ?? ""),
        macAddress: String(b["mac-address"] ?? ""),
        address: b.address ? String(b.address) : "",
        toAddress: b["to-address"] ? String(b["to-address"]) : "",
        server: b.server ? String(b.server) : "all",
        type: String(b.type ?? "regular"), // regular | bypassed | blocked
        disabled: b.disabled === "true",
        comment: b.comment ? String(b.comment) : "",
      })),
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { macAddress, address, type, server, comment } = body as Record<string, string>;
  // type: bypassed (skip auth), regular (force login), blocked (deny)
  if (!macAddress && !address) {
    return new Response(JSON.stringify({ error: "MAC address atau address wajib diisi" }), { status: 400 });
  }
  const finalType = ["bypassed", "regular", "blocked"].includes(type) ? type : "bypassed";

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=type=${finalType}`];
    if (macAddress) args.push(`=mac-address=${macAddress}`);
    if (address) args.push(`=address=${address}`);
    if (server && server !== "all") args.push(`=server=${server}`);
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/ip/hotspot/ip-binding/add", args);
    return { ok: true };
  });
}
