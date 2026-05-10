export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";

const LOGIN_URL =
  process.env.NODE_ENV === "production"
    ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN || "mikroplay.com"}/login`
    : "/login";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.subdomain !== subdomain) {
    redirect(LOGIN_URL);
  }

  const user = await prisma.user.findUnique({
    where: { subdomain },
    include: { routerConfig: true },
  });

  if (!user) return notFound();

  return <DashboardShell user={user} routerConfig={user.routerConfig} />;
}
