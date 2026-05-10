import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production-xxxxx32";

export function createSession(userId: string, brand: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, brand, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string): { userId: string; brand: string } | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return { userId: data.userId, brand: data.brand };
  } catch {
    return null;
  }
}

export function getSessionFromCookie(value: string | undefined): { userId: string; brand: string } | null {
  return value ? verifySession(value) : null;
}
