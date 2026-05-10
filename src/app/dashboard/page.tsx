export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mikroplay.com";
const LOGIN_URL = process.env.NODE_ENV === "production" ? `${APP_URL}/login` : "/login";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect(LOGIN_URL);

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect(LOGIN_URL);

  return <DashboardShell user={user} />;
}
