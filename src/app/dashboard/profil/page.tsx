export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfilClient from "./ProfilClient";

export default async function ProfilPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect("/masuk");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/masuk");

  return <ProfilClient user={user} />;
}
