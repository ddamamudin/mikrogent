// Rate limit per (action, ip) — Postgres-backed atomic counter.
// Persisten lewat restart PM2/crash, race-safe via INSERT ... ON CONFLICT WHERE.
// Fail-open: kalau DB error, biarkan request lewat (jangan block user karena masalah infra).

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number; // ms
}

// Opportunistic cleanup: kira-kira tiap 1% request, hapus bucket yang resetAt-nya udah lama lewat.
// Pakai random sampling, gak ada cron yang perlu di-maintain.
async function maybeCleanup() {
  if (Math.random() > 0.01) return;
  try {
    await prisma.$executeRaw`
      DELETE FROM "RateLimitBucket"
      WHERE "resetAt" < NOW() - INTERVAL '1 hour'
    `;
  } catch {
    // ignore cleanup errors
  }
}

export async function rateLimit(opts: {
  key: string;
  ip: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = new Date();
  const newResetAt = new Date(now.getTime() + opts.windowMs);

  try {
    // Atomic: INSERT kalau bucket belum ada, atau UPDATE incremental kalau ada DAN belum lewat limit (window aktif),
    // atau reset ke count=1 dengan window baru kalau window lama udah expired.
    // WHERE filter mencegah increment lewat batas; rows kosong = limit kena.
    const result = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitBucket" ("id", "action", "ip", "count", "resetAt", "updatedAt")
      VALUES (${randomUUID()}, ${opts.key}, ${opts.ip}, 1, ${newResetAt}, NOW())
      ON CONFLICT ("action", "ip") DO UPDATE
      SET
        "count" = CASE WHEN "RateLimitBucket"."resetAt" < NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" < NOW() THEN ${newResetAt} ELSE "RateLimitBucket"."resetAt" END,
        "updatedAt" = NOW()
      WHERE
        "RateLimitBucket"."resetAt" < NOW()
        OR "RateLimitBucket"."count" < ${opts.limit}
      RETURNING "count", "resetAt"
    `;

    void maybeCleanup();

    if (result.length > 0) {
      const { count, resetAt } = result[0];
      return {
        ok: true,
        remaining: Math.max(0, opts.limit - count),
        resetIn: Math.max(0, resetAt.getTime() - now.getTime()),
      };
    }

    // Limit kena: fetch resetAt sekarang biar bisa kasih Retry-After ke client
    const current = await prisma.rateLimitBucket.findUnique({
      where: { action_ip: { action: opts.key, ip: opts.ip } },
      select: { resetAt: true },
    });
    return {
      ok: false,
      remaining: 0,
      resetIn: current ? Math.max(0, current.resetAt.getTime() - now.getTime()) : opts.windowMs,
    };
  } catch (e) {
    console.error("[rate-limit] DB error, fail-open:", e instanceof Error ? e.message : e);
    return { ok: true, remaining: opts.limit, resetIn: opts.windowMs };
  }
}
