import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptSshPass } from "@/lib/crypto";
import { withRouterosApi } from "@/lib/mikrotik";
import type { RouterOSAPI } from "node-routeros";

// Helper buat endpoint yang scoped ke 1 MikrotikCredential milik user.
// Handle: auth check, ownership check, apiEnabled check, decrypt, connect API,
// pass api ke handler, auto close. Return Response apa adanya dari handler,
// atau error response konsisten kalau gagal di salah satu step.
export async function withCredentialApi<T>(
  credentialId: string,
  handler: (api: RouterOSAPI) => Promise<T>,
  options?: { timeoutMs?: number },
): Promise<NextResponse> {
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

  const cred = await prisma.mikrotikCredential.findUnique({ where: { id: credentialId } });
  if (!cred) return NextResponse.json({ error: "Router tidak ditemukan" }, { status: 404 });
  if (cred.userId !== user.id) return NextResponse.json({ error: "Router bukan milik Anda" }, { status: 403 });
  if (!cred.apiEnabled) {
    return NextResponse.json(
      { error: "RouterOS API belum diaktifkan di router ini" },
      { status: 400 },
    );
  }

  const apiCfg = {
    host: cred.host,
    apiPort: cred.apiPort,
    username: cred.sshUser,
    password: decryptSshPass(cred.sshPass),
    timeoutMs: options?.timeoutMs ?? 8000,
  };

  try {
    const data = await withRouterosApi(apiCfg, handler);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `RouterOS API error: ${msg}` }, { status: 502 });
  }
}
