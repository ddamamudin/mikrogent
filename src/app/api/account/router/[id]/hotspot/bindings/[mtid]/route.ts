export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const action: string = body.action ?? "set";

  return withCredentialApi(id, async (api) => {
    if (action === "enable") {
      await api.write("/ip/hotspot/ip-binding/set", [`=.id=${decodedMtid}`, "=disabled=no"]);
      return { ok: true };
    }
    if (action === "disable") {
      await api.write("/ip/hotspot/ip-binding/set", [`=.id=${decodedMtid}`, "=disabled=yes"]);
      return { ok: true };
    }
    // Default: set fields
    const fields = (body.fields ?? {}) as Record<string, string>;
    const args: string[] = [`=.id=${decodedMtid}`];
    const map: Record<string, string> = {
      macAddress: "mac-address",
      address: "address",
      type: "type",
      server: "server",
      comment: "comment",
    };
    for (const [k, mtKey] of Object.entries(map)) {
      if (fields[k] !== undefined) {
        const v = fields[k] ?? "";
        if (k === "server" && v === "all") args.push(`=server=`);
        else args.push(`=${mtKey}=${v}`);
      }
    }
    if (args.length === 1) return { ok: true, noop: true };
    await api.write("/ip/hotspot/ip-binding/set", args);
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/hotspot/ip-binding/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
