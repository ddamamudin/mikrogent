import { redirect } from "next/navigation";

export default function PasswordRedirect() {
  redirect("/dashboard/profil?tab=password");
}
