export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { executeMikrotikCommand, scanMikrotikConfig, enableRouterosApiService, testRouterosApi } from "@/lib/mikrotik";
import { decryptSshPass } from "@/lib/crypto";
import { RT } from "@/lib/realtime/events";

function notifyRouterChange(userId: string) {
  RT.adminRouterChanged().catch(() => {});
  RT.tenantUpserted(userId).catch(() => {});
  RT.userRouterChanged(userId).catch(() => {});
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, validated: true } });
  if (!user?.validated)
    return NextResponse.json({ error: "Akun belum tervalidasi" }, { status: 403 });

  const cred = await prisma.mikrotikCredential.findUnique({ where: { id } });
  if (!cred) return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  if (cred.userId !== user.id) return NextResponse.json({ error: "Router bukan milik Anda" }, { status: 403 });

  const password = decryptSshPass(cred.sshPass);
  const cfg = { host: cred.host, port: cred.port, username: cred.sshUser, password };
  try {
    await executeMikrotikCommand("/system identity print", cfg);
    const snapshot = await scanMikrotikConfig(cfg);
    await Promise.all([
      prisma.mikrotikCredential.update({ where: { id }, data: { connected: true } }),
      prisma.agentMemory.upsert({
        where: { credentialId: id },
        update: { content: snapshot },
        create: { credentialId: id, content: snapshot },
      }),
    ]);
    notifyRouterChange(user.id);

    // Best-effort: auto-enable RouterOS API service di background biar user
    // langsung bisa pakai halaman Monitor tanpa klik "Aktifkan API" terpisah.
    // Gagal di-silent: user tetep bisa retry manual via tombol kalau perlu.
    void (async () => {
      try {
        const enableRes = await enableRouterosApiService(cfg);
        if (!enableRes.ok) return;
        const testRes = await testRouterosApi({
          host: cred.host, apiPort: enableRes.port, username: cred.sshUser, password,
        });
        if (!testRes.ok) {
          // Service udah on tapi gak reachable (firewall/NAT). Save port aktual
          // biar pas user retry manual gak hit port default 8728 yang salah.
          await prisma.mikrotikCredential.update({
            where: { id }, data: { apiPort: enableRes.port },
          }).catch(() => {});
          return;
        }
        await prisma.mikrotikCredential.update({
          where: { id }, data: { apiEnabled: true, apiPort: enableRes.port },
        });
        notifyRouterChange(user.id);
      } catch {
        // Total silent — verify SSH udah sukses, API enable adalah bonus.
      }
    })();

    return NextResponse.json({ ok: true, connected: true });
  } catch (e) {
    await prisma.mikrotikCredential.update({ where: { id }, data: { connected: false } }).catch(() => {});
    notifyRouterChange(user.id);
    return NextResponse.json({ ok: false, connected: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
