export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const profile = sp.get("profile");
  const service = sp.get("service");

  return withCredentialApi(id, async (api) => {
    const args: string[] = [];
    if (profile) args.push(`?profile=${profile}`);
    if (service && service !== "any") args.push(`?service=${service}`);
    const rows = await api.write("/ppp/secret/print", args);
    return {
      secrets: (rows as Array<Record<string, unknown>>).map((s) => ({
        id: String(s[".id"] ?? ""),
        name: String(s.name ?? ""),
        password: s.password ? String(s.password) : "",
        service: String(s.service ?? "any"),
        profile: String(s.profile ?? "default"),
        localAddress: s["local-address"] ? String(s["local-address"]) : "",
        remoteAddress: s["remote-address"] ? String(s["remote-address"]) : "",
        callerId: s["caller-id"] ? String(s["caller-id"]) : "",
        comment: s.comment ? String(s.comment) : "",
        disabled: s.disabled === "true",
        lastLoggedOut: s["last-logged-out"] ? String(s["last-logged-out"]) : "",
      })),
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, password, service, profile, localAddress, remoteAddress, callerId, comment } = body as Record<string, string>;
  if (!name) return new Response(JSON.stringify({ error: "Name wajib" }), { status: 400 });

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=name=${name}`];
    if (password) args.push(`=password=${password}`);
    if (service && service !== "any") args.push(`=service=${service}`);
    if (profile) args.push(`=profile=${profile}`);
    if (localAddress) args.push(`=local-address=${localAddress}`);
    if (remoteAddress) args.push(`=remote-address=${remoteAddress}`);
    if (callerId) args.push(`=caller-id=${callerId}`);
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/ppp/secret/add", args);
    return { ok: true };
  });
}
