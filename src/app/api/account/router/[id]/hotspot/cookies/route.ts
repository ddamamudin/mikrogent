export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Hotspot cookies = cache login user (kalau RouterOS hotspot profile-nya
// enable "cookie" buat auto-login). Hapus cookie = paksa user login ulang
// pas reconnect.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/hotspot/cookie/print");
    return {
      cookies: (rows as Array<Record<string, unknown>>).map((c) => ({
        id: String(c[".id"] ?? ""),
        user: String(c.user ?? ""),
        macAddress: c["mac-address"] ? String(c["mac-address"]) : "",
        domain: c.domain ? String(c.domain) : "",
        expiresIn: c["expires-in"] ? String(c["expires-in"]) : "",
      })),
    };
  });
}
