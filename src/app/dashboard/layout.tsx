export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie, verifyImpersonatorToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";
import PendingValidation from "./PendingValidation";
import ImpersonateBanner from "./ImpersonateBanner";

const LOGIN_URL = process.env.NODE_ENV === "production"
  ? `${process.env.NEXT_PUBLIC_APP_URL || "https://mikroplay.com"}/masuk`
  : "/masuk";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) redirect(LOGIN_URL);

  const impersonator = verifyImpersonatorToken(cookieStore.get("impersonator")?.value);

  const [user, config] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, brand: true, email: true, validated: true },
    }),
    prisma.appConfig.findUnique({ where: { id: "singleton" } }),
  ]);
  if (!user) redirect(LOGIN_URL);

  if (!user.validated) {
    return (
      <>
        {impersonator && <ImpersonateBanner adminName={impersonator.adminName} targetName={user.name} />}
        <PendingValidation name={user.name} email={user.email} />
      </>
    );
  }

  const showBrandField = config?.showBrandField ?? true;

  return (
    <>
      {impersonator && <ImpersonateBanner adminName={impersonator.adminName} targetName={user.name} />}
      <DashboardLayoutClient user={user} showBrandField={showBrandField}>{children}</DashboardLayoutClient>
    </>
  );
}
