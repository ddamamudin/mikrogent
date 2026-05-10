import { NextRequest, NextResponse } from "next/server";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";
const ROOT_HOSTNAMES = new Set([APP_DOMAIN, `www.${APP_DOMAIN}`, "localhost"]);

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
    return NextResponse.rewrite(url);
  }

  // Guard /admin/** — redirect ke /admin/masuk jika tidak ada session
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/masuk") && !pathname.startsWith("/admin/setup")) {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/admin/masuk", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
