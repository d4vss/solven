import type { Metadata } from "next";
import { headers } from "next/headers";
import { AccountSettings } from "@/components/account/account-settings";
import { auth } from "@/lib/auth";
import { getUserOAuthConnections } from "@/lib/account-oauth";

export const metadata: Metadata = {
  title: "Identity",
  description: "Your public handle, sign-in, and account options.",
};

export default async function AccountProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  const connections = userId ? await getUserOAuthConnections(userId) : [];

  return (
    <div className="space-y-6 pb-16 pt-10 md:pb-24 md:pt-12">
      <AccountSettings connections={connections} />
    </div>
  );
}
