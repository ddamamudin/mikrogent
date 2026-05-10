import { NextRequest, NextResponse } from "next/server";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
const ROOT_HOSTNAMES = new Set([APP_DOMAIN, `www.${APP_DOMAIN}`, "localhost"]);

export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  let brand: string | null = null;

  if (hostname.endsWith(`.${APP_DOMAIN}`)) {
    brand = hostname.slice(0, -(APP_DOMAIN.length + 1));
  } else if (hostname.endsWith(".localhost")) {
    brand = hostname.slice(0, -(".localhost".length));
  }

  if (!brand || ROOT_HOSTNAMES.has(hostname)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/site/${brand}${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
