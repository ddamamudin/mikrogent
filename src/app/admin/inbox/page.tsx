export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import InboxListClient from "./InboxListClient";

export default async function AdminInboxPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/admin/masuk");
  return <InboxListClient />;
}
