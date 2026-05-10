export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RouterSetup from "@/components/RouterSetup";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const user = await prisma.user.findUnique({
    where: { subdomain },
    include: { routerConfig: true },
  });

  if (!user) return notFound();

  if (!user.routerConfig) {
    return <RouterSetup subdomain={subdomain} userName={user.name} />;
  }

  return <DashboardShell user={user} routerConfig={user.routerConfig} />;
}
