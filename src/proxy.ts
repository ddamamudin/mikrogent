import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  createSession,
  sessionCookieOptions,
  SESSION_RENEW_THRESHOLD_MS,
} from "@/lib/session";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
const ROOT_HOSTNAMES = new Set([APP_DOMAIN, `www.${APP_DOMAIN}`, "localhost"]);

function maybeRenewSession(req: NextRequest, res: NextResponse): NextResponse {
  const token = req.cookies.get("session")?.value;
  if (!token) return res;
  const verified = verifySession(token);
  if (!verified) return res;
  const remaining = verified.exp - Date.now();
  if (remaining > SESSION_RENEW_THRESHOLD_MS) return res;
  const fresh = createSession(verified.userId, verified.brand, verified.role);
  res.cookies.set("session", fresh, sessionCookieOptions());
  return res;
}

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const { pathname } = req.nextUrl;

  let brand: string | null = null;

  if (hostname.endsWith(`.${APP_DOMAIN}`)) {
    brand = hostname.slice(0, -(APP_DOMAIN.length + 1));
  } else if (hostname.endsWith(".localhost")) {
    brand = hostname.slice(0, -(".localhost".length));
  }

  // Subdomain rewrite
  if (brand && !ROOT_HOSTNAMES.has(hostname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/site/${brand}${pathname === "/" ? "" : pathname}`;
    return maybeRenewSession(req, NextResponse.rewrite(url));
  }

  // Guard /admin/** - redirect ke /masuk jika tidak ada session
  if (pathname.startsWith("/admin")) {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/masuk", req.url));
    }
  }

  return maybeRenewSession(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
