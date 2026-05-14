export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

// PATCH .../[mtid]
// Body: { action?: "set"|"enable"|"disable"|"reset", fields?: {...} }
// Default action = "set" (update fields).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const action: string = body.action ?? "set";

  return withCredentialApi(id, async (api) => {
    if (action === "enable") {
      await api.write("/ip/hotspot/user/set", [`=.id=${decodedMtid}`, "=disabled=no"]);
      return { ok: true };
    }
    if (action === "disable") {
      await api.write("/ip/hotspot/user/set", [`=.id=${decodedMtid}`, "=disabled=yes"]);
      return { ok: true };
    }
    if (action === "reset") {
      // Reset-counters + clear mac-address (kalau profile bukan locked, MAC akan
      // ke-set lagi pas login berikut; kalau locked, user bisa login dari device baru).
      await api.write("/ip/hotspot/user/reset-counters", [`=.id=${decodedMtid}`]);
      await api.write("/ip/hotspot/user/set", [`=.id=${decodedMtid}`, "=mac-address="]);
      return { ok: true };
    }
    // Default: set fields
    const fields = (body.fields ?? {}) as Record<string, string>;
    const args: string[] = [`=.id=${decodedMtid}`];
    const map: Record<string, string> = {
      name: "name",
      password: "password",
      profile: "profile",
      server: "server",
      comment: "comment",
      limitUptime: "limit-uptime",
      limitBytes: "limit-bytes-total",
    };
    for (const [k, mtKey] of Object.entries(map)) {
      if (fields[k] !== undefined) {
        const val = fields[k] ?? "";
        // server=all itu pseudo, di RouterOS isinya empty kalau pengen all
        if (k === "server" && val === "all") args.push(`=server=`);
        else args.push(`=${mtKey}=${val}`);
      }
    }
    if (args.length === 1) return { ok: true, noop: true };
    await api.write("/ip/hotspot/user/set", args);
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/hotspot/user/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
