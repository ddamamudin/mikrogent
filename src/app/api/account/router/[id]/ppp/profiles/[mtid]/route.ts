export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const fields = (body.fields ?? {}) as Record<string, string>;

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=.id=${decodedMtid}`];
    if (fields.name !== undefined) args.push(`=name=${fields.name}`);
    if (fields.localAddress !== undefined) args.push(`=local-address=${fields.localAddress ?? ""}`);
    if (fields.remoteAddress !== undefined) args.push(`=remote-address=${fields.remoteAddress ?? ""}`);
    if (fields.rateLimit !== undefined) args.push(`=rate-limit=${fields.rateLimit ?? ""}`);
    if (fields.dnsServer !== undefined) args.push(`=dns-server=${fields.dnsServer ?? ""}`);
    if (fields.parentQueue !== undefined) {
      const val = String(fields.parentQueue ?? "");
      args.push(`=parent-queue=${val === "none" || val === "" ? "none" : val}`);
    }
    if (fields.onlyOne !== undefined) args.push(`=only-one=${fields.onlyOne || "default"}`);
    if (fields.sessionTimeout !== undefined) args.push(`=session-timeout=${fields.sessionTimeout ?? ""}`);
    if (fields.comment !== undefined) args.push(`=comment=${fields.comment ?? ""}`);
    if (args.length === 1) return { ok: true, noop: true };
    await api.write("/ppp/profile/set", args);
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ppp/profile/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
