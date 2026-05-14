export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decoded = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/arp/remove", [`=.id=${decoded}`]);
    return { ok: true };
  });
}
