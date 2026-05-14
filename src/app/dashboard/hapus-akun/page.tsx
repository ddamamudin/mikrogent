import { redirect } from "next/navigation";

export default function HapusAkunRedirect() {
  redirect("/dashboard/profil?tab=hapus");
}
