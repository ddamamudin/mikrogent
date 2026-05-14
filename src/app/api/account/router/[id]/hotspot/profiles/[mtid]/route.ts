export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

import { buildOnLogin } from "../route";

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const fields = (body.fields ?? {}) as Record<string, string | number | boolean>;

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=.id=${decodedMtid}`];
    if (fields.name !== undefined) args.push(`=name=${fields.name}`);
    if (fields.sharedUsers !== undefined) args.push(`=shared-users=${fields.sharedUsers}`);
    if (fields.rateLimit !== undefined) args.push(`=rate-limit=${fields.rateLimit ?? ""}`);
    if (fields.addressPool !== undefined) {
      const val = String(fields.addressPool ?? "");
      args.push(`=address-pool=${val === "none" ? "" : val}`);
    }
    if (fields.parentQueue !== undefined) {
      const val = String(fields.parentQueue ?? "");
      args.push(`=parent-queue=${val === "none" ? "none" : val}`);
    }
    // Rebuild on-login kalau salah satu field meta diubah
    if (fields.expmode !== undefined || fields.validity !== undefined || fields.price !== undefined || fields.sprice !== undefined || fields.lockUser !== undefined) {
      // Ambil dulu existing buat fallback
      const existing = await api.write("/ip/hotspot/user/profile/print", [`?.id=${decodedMtid}`]);
      const e = (existing[0] ?? {}) as Record<string, unknown>;
      const onLoginNow = String(e["on-login"] ?? "");
      const m = onLoginNow.match(/"(,[^"]*,)"/);
      let cur = { expmode: "0", price: "0", validity: "", sprice: "0", lockUser: false };
      if (m) {
        const parts = m[1].split(",");
        cur = {
          expmode: parts[1] ?? "0",
          price: parts[2] ?? "0",
          validity: parts[3] ?? "",
          sprice: parts[4] ?? "0",
          lockUser: (parts[6] ?? "") === "Enable",
        };
      }
      const onLogin = buildOnLogin({
        expmode: String(fields.expmode ?? cur.expmode),
        validity: String(fields.validity ?? cur.validity),
        price: Number(fields.price ?? cur.price),
        sprice: Number(fields.sprice ?? cur.sprice),
        lockUser: fields.lockUser !== undefined ? !!fields.lockUser : cur.lockUser,
      });
      args.push(`=on-login=${onLogin}`);
    }
    if (args.length === 1) return { ok: true, noop: true };
    await api.write("/ip/hotspot/user/profile/set", args);
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/hotspot/user/profile/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
