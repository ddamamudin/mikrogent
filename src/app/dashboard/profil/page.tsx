export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfilTabsClient from "./ProfilTabsClient";

export default async function ProfilPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect("/masuk");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/masuk");

  return (
    <Suspense fallback={null}>
      <ProfilTabsClient user={user} />
    </Suspense>
  );
}
