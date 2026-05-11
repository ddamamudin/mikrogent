import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production-xxxxx32";

// 30 hari session, perpanjang otomatis kalau sisa < 15 hari (sliding renewal)
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
export const SESSION_RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  userId: string;
  brand: string | null;
  role: "USER" | "ADMIN";
  exp: number;
};

export function createSession(userId: string, brand: string | null, role: "USER" | "ADMIN" = "USER"): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, brand, role, exp: Date.now() + SESSION_DURATION_MS })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return {
      userId: data.userId,
      brand: data.brand ?? null,
      role: data.role ?? "USER",
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function getSessionFromCookie(value: string | undefined): SessionPayload | null {
  return value ? verifySession(value) : null;
}

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: "/";
  domain?: string;
};

export function sessionCookieOptions(): SessionCookieOptions {
  const production = process.env.NODE_ENV === "production";
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
    domain: production && domain ? `.${domain}` : undefined,
  };
}
