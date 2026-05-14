export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// POST /api/account/router/[id]/system/action
// Body: { action: "reboot" | "shutdown" }
// Catatan: RouterOS akan langsung disconnect setelah command diterima. Kita
// tetap return ok cepat — kalau koneksi keburu close di tengah jalan, anggap
// command sudah ke-deliver (RouterOS commit dulu, baru disconnect).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  if (action !== "reboot" && action !== "shutdown") {
    return new Response(JSON.stringify({ error: "action harus 'reboot' atau 'shutdown'" }), { status: 400 });
  }
  return withCredentialApi(id, async (api) => {
    const cmd = action === "reboot" ? "/system/reboot" : "/system/shutdown";
    try {
      await api.write(cmd);
    } catch (e) {
      // Router kadang langsung close socket sebelum reply — itu normal.
      const msg = e instanceof Error ? e.message : String(e);
      if (!/closed|EPIPE|ECONNRESET|timeout/i.test(msg)) throw e;
    }
    return { ok: true, action };
  });
}
