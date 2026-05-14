export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

// Kick user dari sesi hotspot (paksa logout). Cookie & host gak ikut dihapus
// supaya user bisa langsung re-login (kalau gak mau, hapus juga via panel host/cookie).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/hotspot/active/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}
