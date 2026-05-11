export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (session?.role === "ADMIN") redirect("/admin/dashboard");
  if (session) redirect("/dashboard/agent");
  redirect("/masuk");
}
