export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/ip/hotspot/host/remove", [`=.id=${decodedMtid}`]);
    return { ok: true };
  });
}

// POST action=make-binding: convert host MAC ke ip-binding type=bypassed.
// Host yang udah jadi binding bisa bypass auth (login otomatis dianggap valid).
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decodedMtid = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  if (body.action !== "make-binding") {
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
  }
  const type: string = body.type === "blocked" ? "blocked" : body.type === "regular" ? "regular" : "bypassed";
  const comment: string = body.comment ?? "";

  return withCredentialApi(id, async (api) => {
    // Ambil mac + address dari host dulu
    const hostRows = await api.write("/ip/hotspot/host/print", [`?.id=${decodedMtid}`]);
    if (!hostRows[0]) throw new Error("Host tidak ditemukan");
    const h = hostRows[0] as Record<string, unknown>;
    const mac = String(h["mac-address"] ?? "");
    const addr = String(h.address ?? "");
    if (!mac) throw new Error("Host tidak punya MAC address");

    const args = [
      `=mac-address=${mac}`,
      `=type=${type}`,
    ];
    if (addr) args.push(`=address=${addr}`);
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/ip/hotspot/ip-binding/add", args);
    return { ok: true, mac, address: addr, type };
  });
}
