import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    maxAge: 0,
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".lintasagent.com" : undefined,
  });
  return NextResponse.json({ ok: true });
}
