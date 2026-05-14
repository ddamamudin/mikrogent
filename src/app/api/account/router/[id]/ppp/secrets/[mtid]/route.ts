export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "set");
  const fields = (body.fields ?? {}) as Record<string, string>;

  return withCredentialApi(id, async (api) => {
    if (action === "enable") {
      await api.write("/ppp/secret/enable", [`=.id=${decodedMtid}`]);
      return { ok: true };
    }
    if (action === "disable") {
      await api.write("/ppp/secret/disable", [`=.id=${decodedMtid}`]);
      return { ok: true };
    }
    const args: string[] = [`=.id=${decodedMtid}`];
    if (fields.name !== undefined) args.push(`=name=${fields.name}`);
    if (fields.password !== undefined) args.push(`=password=${fields.password ?? ""}`);
    if (fields.service !== undefined) args.push(`=service=${fields.service || "any"}`);
    if (fields.profile !== undefined) args.push(`=profile=${fields.profile}`);
    if (fields.localAddress !== undefined) args.push(`=local-address=${fields.localAddress ?? ""}`);
    if (fields.remoteAddress !== undefined) args.push(`=remote-address=${fields.remoteAddress ?? ""}`);
    if (fields.callerId !== undefined) args.push(`=caller-id=${fields.callerId ?? ""}`);
    if (fields.comment !== undefined) args.push(`=comment=${fields.comment ?? ""}`);
    if (args.length === 1) return { ok: true, noop: true };
    await api.write("/ppp/secret/set", args);
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ppp/secret/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
