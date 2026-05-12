// Simple in-memory rate limiter - fixed window per IP+key.
// Works for single-process deployment (PM2 fork mode 1 instance).
// Untuk multi-instance, ganti store ke Redis.

import { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// Cleanup expired entries tiap 10 menit
let cleanupTimer: NodeJS.Timeout | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of store.entries()) {
      if (b.resetAt < now) store.delete(k);
    }
  }, 10 * 60 * 1000);
  cleanupTimer.unref?.();
}

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

export function rateLimit(opts: {
  key: string;
  ip: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const k = `${opts.key}:${opts.ip}`;
  const existing = store.get(k);

  if (!existing || existing.resetAt < now) {
    store.set(k, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetIn: opts.windowMs };
  }

  if (existing.count >= opts.limit) {
    return { ok: false, remaining: 0, resetIn: existing.resetAt - now };
  }

  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count, resetIn: existing.resetAt - now };
}
