export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Traffic Monitor — pattern Mikhmon v3 (polling 1-sample, koneksi short-lived):
//
// GET /api/account/router/[id]/traffic
//   tanpa ?interface → return list interface (untuk dropdown picker)
//
// GET /api/account/router/[id]/traffic?interface=ether1
//   return 1 sample TX/RX di waktu sekarang
//
// Trick: pakai `/interface/monitor-traffic` dengan flag `once=""` supaya
// RouterOS balas 1 sample lalu close (bukan continuous stream). Ini yang
// dipakai Mikhmon — mitigasi koneksi hang.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iface = req.nextUrl.searchParams.get("interface");

  return withCredentialApi(id, async (api) => {
    if (!iface) {
      const rows = await api.write("/interface/print");
      return {
        interfaces: (rows as Array<Record<string, unknown>>).map((r) => ({
          name: String(r.name ?? ""),
          type: r.type ? String(r.type) : "",
          running: r.running === "true",
          disabled: r.disabled === "true",
          comment: r.comment ? String(r.comment) : "",
        })),
      };
    }

    const rows = await api.write("/interface/monitor-traffic", [
      `=interface=${iface}`,
      `=once=`,
    ]);
    const sample = (rows[0] ?? {}) as Record<string, unknown>;
    return {
      ts: Date.now(),
      interface: iface,
      txBps: parseInt(String(sample["tx-bits-per-second"] ?? "0"), 10) || 0,
      rxBps: parseInt(String(sample["rx-bits-per-second"] ?? "0"), 10) || 0,
      txPps: parseInt(String(sample["tx-packets-per-second"] ?? "0"), 10) || 0,
      rxPps: parseInt(String(sample["rx-packets-per-second"] ?? "0"), 10) || 0,
    };
  });
}
