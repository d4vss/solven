import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInView } from "@/components/auth/sign-in-view";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Solven with GitHub or Google.",
};

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) {
    redirect("/account");
  }
  return <SignInView />;
}
