export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import InboxThreadClient from "./InboxThreadClient";

export default async function AdminInboxThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") redirect("/masuk");
  const { id } = await params;
  return <InboxThreadClient feedbackId={id} />;
}
