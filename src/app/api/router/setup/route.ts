import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";

export async function POST(req: NextRequest) {
  const { subdomain, routerIp, routerUser, routerPass, hotspotName, apiPort } = await req.json();

  const user = await prisma.user.findUnique({ where: { subdomain } });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  await prisma.routerConfig.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      routerIp,
      routerUser,
      routerPass: encrypt(routerPass),
      hotspotName: hotspotName || null,
      apiPort: apiPort || 8728,
    },
    update: {
      routerIp,
      routerUser,
      routerPass: encrypt(routerPass),
      hotspotName: hotspotName || null,
      apiPort: apiPort || 8728,
    },
  });

  return NextResponse.json({ ok: true });
}
