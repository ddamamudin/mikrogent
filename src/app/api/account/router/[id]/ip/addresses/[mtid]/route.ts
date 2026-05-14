export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decoded = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  return withCredentialApi(id, async (api) => {
    if (action === "enable") {
      await api.write("/ip/address/enable", [`=.id=${decoded}`]);
      return { ok: true };
    }
    if (action === "disable") {
      await api.write("/ip/address/disable", [`=.id=${decoded}`]);
      return { ok: true };
    }
    return { error: "action tidak dikenali" };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decoded = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/address/remove", [`=.id=${decoded}`]);
    return { ok: true };
  });
}
