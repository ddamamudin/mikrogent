export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { withRouterosApi } from "@/lib/mikrotik";
import { decryptSshPass } from "@/lib/crypto";

// Helper: ambil int dari field RouterOS (string), default 0 kalau parse gagal.
function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

// "true"/"false" string → bool.
function toBool(v: unknown): boolean {
  return v === "true" || v === true;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, validated: true },
  });
  if (!user?.validated)
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });

  const cred = await prisma.mikrotikCredential.findUnique({ where: { id } });
  if (!cred) return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  if (cred.userId !== user.id) return NextResponse.json({ error: "Router bukan milik Anda" }, { status: 403 });
  if (!cred.apiEnabled) {
    return NextResponse.json(
      { error: "RouterOS API belum diaktifkan di router ini. Aktifkan dulu dari halaman Router." },
      { status: 400 },
    );
  }

  const apiCfg = {
    host: cred.host,
    apiPort: cred.apiPort,
    username: cred.sshUser,
    password: decryptSshPass(cred.sshPass),
    timeoutMs: 6000,
  };

  try {
    const status = await withRouterosApi(apiCfg, async (api) => {
      // Paralel: semua query independen. Cap hasil-nya tipis-tipis biar gak overflow.
      const [identityRows, resourceRows, boardRows, ifaceRows, hsActiveRows, pppActiveRows, dhcpRows] = await Promise.all([
        api.write("/system/identity/print"),
        api.write("/system/resource/print"),
        api.write("/system/routerboard/print").catch(() => []),
        api.write("/interface/print"),
        api.write("/ip/hotspot/active/print", ["=count-only="]).catch(() => []),
        api.write("/ppp/active/print", ["=count-only="]).catch(() => []),
        api.write("/ip/dhcp-server/lease/print").catch(() => []),
      ]);

      const r = resourceRows?.[0] ?? {};
      const b = boardRows?.[0] ?? {};

      // RouterOS print count-only return [{ ret: "N" }]
      const countOnly = (rows: Array<Record<string, unknown>>): number => {
        if (!Array.isArray(rows) || rows.length === 0) return 0;
        const ret = rows[0]?.ret;
        return toInt(ret);
      };

      const dhcpBound = Array.isArray(dhcpRows)
        ? dhcpRows.filter((l) => (l as Record<string, unknown>).status === "bound").length
        : 0;

      // Limit interface list ke 30 (kasus router puluhan VLAN gak ngebebani UI)
      const interfaces = (ifaceRows as Array<Record<string, unknown>>).slice(0, 30).map((i) => ({
        name: String(i.name ?? ""),
        type: i.type ? String(i.type) : undefined,
        running: toBool(i.running),
        disabled: toBool(i.disabled),
        mac: i["mac-address"] ? String(i["mac-address"]) : undefined,
        rxByte: i["rx-byte"] ? String(i["rx-byte"]) : undefined,
        txByte: i["tx-byte"] ? String(i["tx-byte"]) : undefined,
      }));

      return {
        identity: String(identityRows?.[0]?.name ?? ""),
        resource: {
          uptime: String(r.uptime ?? ""),
          version: String(r.version ?? ""),
          boardName: String(r["board-name"] ?? ""),
          cpuLoad: String(r["cpu-load"] ?? "0"),
          freeMemory: toInt(r["free-memory"]),
          totalMemory: toInt(r["total-memory"]),
          freeHdd: toInt(r["free-hdd-space"]),
          totalHdd: toInt(r["total-hdd-space"]),
          architecture: r["architecture-name"] ? String(r["architecture-name"]) : undefined,
        },
        routerboard: {
          model: b.model ? String(b.model) : undefined,
          serialNumber: b["serial-number"] ? String(b["serial-number"]) : undefined,
          firmwareType: b["firmware-type"] ? String(b["firmware-type"]) : undefined,
        },
        interfaces,
        counts: {
          hotspotActive: countOnly(hsActiveRows as Array<Record<string, unknown>>),
          pppActive: countOnly(pppActiveRows as Array<Record<string, unknown>>),
          dhcpLeasesBound: dhcpBound,
        },
        fetchedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Gagal konek API: ${msg}` }, { status: 502 });
  }
}
