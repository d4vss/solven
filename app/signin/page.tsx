import type { Metadata } from "next";
import { SignInView } from "@/components/auth/sign-in-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Solven with GitHub or Google.",
};

export default function SignInPage() {
  return <SignInView />;
}
