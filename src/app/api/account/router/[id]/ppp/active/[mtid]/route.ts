export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

// Disconnect PPP session — paksa logout. User bisa redial.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ppp/active/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
