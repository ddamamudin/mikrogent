import { NextRequest, NextResponse } from "next/server";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
const ROOT_HOSTNAMES = new Set([APP_DOMAIN, `www.${APP_DOMAIN}`, "localhost"]);

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  let subdomain: string | null = null;

  if (hostname.endsWith(`.${APP_DOMAIN}`)) {
    subdomain = hostname.slice(0, -(APP_DOMAIN.length + 1));
  } else if (hostname.endsWith(".localhost")) {
    subdomain = hostname.slice(0, -(".localhost".length));
  }

  if (!subdomain || ROOT_HOSTNAMES.has(hostname)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/dashboard/${subdomain}${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
