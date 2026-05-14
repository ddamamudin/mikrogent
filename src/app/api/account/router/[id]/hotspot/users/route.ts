export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// GET /api/account/router/[id]/hotspot/users?profile=&server=&comment=
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const profile = sp.get("profile");
  const server = sp.get("server");
  const comment = sp.get("comment");
  const name = sp.get("name");

  return withCredentialApi(id, async (api) => {
    const args: string[] = [];
    if (profile) args.push(`?profile=${profile}`);
    if (server && server !== "all") args.push(`?server=${server}`);
    if (comment) args.push(`?comment=${comment}`);
    if (name) args.push(`?name=${name}`);
    const rows = await api.write("/ip/hotspot/user/print", args);
    return {
      users: (rows as Array<Record<string, unknown>>).map((u) => ({
        id: String(u[".id"] ?? ""),
        name: String(u.name ?? ""),
        password: u.password ? String(u.password) : "",
        profile: String(u.profile ?? "default"),
        server: u.server ? String(u.server) : "all",
        comment: u.comment ? String(u.comment) : "",
        disabled: u.disabled === "true",
        limitUptime: u["limit-uptime"] ? String(u["limit-uptime"]) : "",
        limitBytesTotal: u["limit-bytes-total"] ? String(u["limit-bytes-total"]) : "",
        uptime: u.uptime ? String(u.uptime) : "",
        bytesIn: u["bytes-in"] ? String(u["bytes-in"]) : "0",
        bytesOut: u["bytes-out"] ? String(u["bytes-out"]) : "0",
        macAddress: u["mac-address"] ? String(u["mac-address"]) : "",
      })),
    };
  });
}

// POST /api/account/router/[id]/hotspot/users
// Body: { name, password, profile, server, comment, limitUptime, limitBytes }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, password, profile, server, comment, limitUptime, limitBytes } = body as Record<string, string>;
  if (!name) {
    return new Response(JSON.stringify({ error: "Name wajib" }), { status: 400 });
  }

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=name=${name}`];
    if (password) args.push(`=password=${password}`);
    if (profile) args.push(`=profile=${profile}`);
    if (server && server !== "all") args.push(`=server=${server}`);
    if (comment) args.push(`=comment=${comment}`);
    if (limitUptime) args.push(`=limit-uptime=${limitUptime}`);
    if (limitBytes) args.push(`=limit-bytes-total=${limitBytes}`);
    const res = await api.write("/ip/hotspot/user/add", args);
    return { created: res };
  });
}
