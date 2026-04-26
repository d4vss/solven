import { redirect } from "next/navigation";

export default function AccountApiAuthRedirect() {
  redirect("/account");
}
