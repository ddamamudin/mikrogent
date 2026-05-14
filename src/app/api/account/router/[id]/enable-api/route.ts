export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { enableRouterosApiService, testRouterosApi } from "@/lib/mikrotik";
import { decryptSshPass } from "@/lib/crypto";
import { RT } from "@/lib/realtime/events";

// Aktifkan service /ip service api di router via SSH, lalu verifikasi
// koneksi dari server Mikroplay via RouterOS API. Update apiEnabled di DB
// kalau dua-duanya sukses.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const password = decryptSshPass(cred.sshPass);
  const sshCfg = { host: cred.host, port: cred.port, username: cred.sshUser, password };

  // Step 1: enable service via SSH + ambil port aktual yang ke-set di RouterOS
  const enableRes = await enableRouterosApiService(sshCfg);
  if (!enableRes.ok) {
    return NextResponse.json(
      { error: `Gagal aktifkan API service via SSH: ${enableRes.error ?? "unknown"}` },
      { status: 400 },
    );
  }

  // Step 2: verify dengan connect API pakai port aktual dari RouterOS
  const actualPort = enableRes.port;
  const testRes = await testRouterosApi({
    host: cred.host,
    apiPort: actualPort,
    username: cred.sshUser,
    password,
  });

  if (!testRes.ok) {
    // Tetep update apiPort biar user gak harus enable ulang setelah firewall di-fix
    await prisma.mikrotikCredential.update({
      where: { id },
      data: { apiPort: actualPort },
    });
    return NextResponse.json(
      {
        error:
          `Service API udah aktif di router (port ${actualPort}), tapi gak bisa connect dari Mikroplay. ` +
          `Kemungkinan firewall input chain MikroTik block port ${actualPort} dari IP server, ` +
          `atau NAT/port-forward di modem ISP belum di-set. Detail: ${testRes.error ?? "(timeout)"}`,
      },
      { status: 400 },
    );
  }

  await prisma.mikrotikCredential.update({
    where: { id },
    data: { apiEnabled: true, apiPort: actualPort },
  });

  RT.userRouterChanged(user.id).catch(() => {});
  RT.adminRouterChanged().catch(() => {});

  return NextResponse.json({
    ok: true,
    apiEnabled: true,
    identity: testRes.identity,
    alreadyEnabled: enableRes.alreadyEnabled,
  });
}
