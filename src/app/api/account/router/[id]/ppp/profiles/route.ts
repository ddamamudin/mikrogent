export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ppp/profile/print");
    const pools = await api.write("/ip/pool/print").catch(() => []);
    return {
      profiles: (rows as Array<Record<string, unknown>>).map((p) => ({
        id: String(p[".id"] ?? ""),
        name: String(p.name ?? ""),
        localAddress: p["local-address"] ? String(p["local-address"]) : "",
        remoteAddress: p["remote-address"] ? String(p["remote-address"]) : "",
        rateLimit: p["rate-limit"] ? String(p["rate-limit"]) : "",
        dnsServer: p["dns-server"] ? String(p["dns-server"]) : "",
        parentQueue: p["parent-queue"] ? String(p["parent-queue"]) : "",
        onlyOne: String(p["only-one"] ?? "default"),
        sessionTimeout: p["session-timeout"] ? String(p["session-timeout"]) : "",
        comment: p.comment ? String(p.comment) : "",
      })),
      pools: (pools as Array<Record<string, unknown>>).map((p) => String(p.name ?? "")),
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, localAddress, remoteAddress, rateLimit, dnsServer, parentQueue, onlyOne, sessionTimeout, comment } = body as Record<string, string>;
  if (!name) return new Response(JSON.stringify({ error: "Name wajib" }), { status: 400 });

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=name=${name}`];
    if (localAddress) args.push(`=local-address=${localAddress}`);
    if (remoteAddress) args.push(`=remote-address=${remoteAddress}`);
    if (rateLimit) args.push(`=rate-limit=${rateLimit}`);
    if (dnsServer) args.push(`=dns-server=${dnsServer}`);
    if (parentQueue && parentQueue !== "none") args.push(`=parent-queue=${parentQueue}`);
    if (onlyOne && onlyOne !== "default") args.push(`=only-one=${onlyOne}`);
    if (sessionTimeout) args.push(`=session-timeout=${sessionTimeout}`);
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/ppp/profile/add", args);
    return { ok: true };
  });
}
