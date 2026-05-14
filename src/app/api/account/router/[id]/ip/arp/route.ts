export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/arp/print");
    return {
      arp: (rows as Array<Record<string, unknown>>).map((r) => ({
        id: String(r[".id"] ?? ""),
        address: String(r.address ?? ""),
        macAddress: r["mac-address"] ? String(r["mac-address"]) : "",
        interface: String(r.interface ?? ""),
        dynamic: r.dynamic === "true",
        complete: r.complete === "true",
        invalid: r.invalid === "true",
        disabled: r.disabled === "true",
        comment: r.comment ? String(r.comment) : "",
      })),
    };
  });
}

// Make-static: convert dynamic ARP jadi static (bisa disimpan)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action, mtid, address, macAddress, interface: iface, comment } = body as Record<string, string>;

  return withCredentialApi(id, async (api) => {
    if (action === "make-static" && mtid) {
      await api.write("/ip/arp/make-static", [`=.id=${mtid}`]);
      return { ok: true };
    }
    if (!address || !macAddress || !iface) {
      return { error: "address, macAddress, interface wajib" };
    }
    const args = [
      `=address=${address}`,
      `=mac-address=${macAddress}`,
      `=interface=${iface}`,
    ];
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/ip/arp/add", args);
    return { ok: true };
  });
}
