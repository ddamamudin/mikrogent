import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com";

  const host = hostname.replace(/:.*/, "");

  const isSubdomain =
    host !== appDomain &&
    host !== `www.${appDomain}` &&
    host.endsWith(`.${appDomain}`);

  if (isSubdomain) {
    const subdomain = host.replace(`.${appDomain}`, "");
    const url = req.nextUrl.clone();
    url.pathname = `/dashboard/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
