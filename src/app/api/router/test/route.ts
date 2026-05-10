import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { RouterOSAPI } from "@/lib/routeros";

export async function POST(req: NextRequest) {
  const { routerIp, routerUser, routerPass, apiPort } = await req.json();

  try {
    const api = new RouterOSAPI(routerIp, apiPort || 8728, routerUser, routerPass, 8000);
    await api.connect();
    const identity = await api.query("/system/identity/print");
    return NextResponse.json({ ok: true, name: identity[0]?.["name"] || routerIp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal terhubung ke router" }, { status: 400 });
  }
}
