export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/address/print");
    const ifaces = await api.write("/interface/print").catch(() => []);
    return {
      addresses: (rows as Array<Record<string, unknown>>).map((r) => ({
        id: String(r[".id"] ?? ""),
        address: String(r.address ?? ""),
        network: r.network ? String(r.network) : "",
        interface: String(r.interface ?? ""),
        dynamic: r.dynamic === "true",
        invalid: r.invalid === "true",
        disabled: r.disabled === "true",
        comment: r.comment ? String(r.comment) : "",
      })),
      interfaces: (ifaces as Array<Record<string, unknown>>).map((i) => String(i.name ?? "")),
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { address, network, interface: iface, comment } = body as Record<string, string>;
  if (!address || !iface) {
    return new Response(JSON.stringify({ error: "address dan interface wajib" }), { status: 400 });
  }
  return withCredentialApi(id, async (api) => {
    const args = [`=address=${address}`, `=interface=${iface}`];
    if (network) args.push(`=network=${network}`);
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/ip/address/add", args);
    return { ok: true };
  });
}
