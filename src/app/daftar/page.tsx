import { prisma } from "@/lib/prisma";
import RegisterClient from "./RegisterClient";

export default async function RegisterPage() {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  const showBrandField = config?.showBrandField ?? true;
  return <RegisterClient showBrandField={showBrandField} />;
}
