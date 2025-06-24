import { SessionProvider } from "next-auth/react";

import AccountOnboarding from "@/components/account-onboarding";
import { auth } from "@/auth";

export default async function Onboarding() {
  const session = await auth();

  if (!session || !session.user) return <div />;
  const providerEmail = session.user.email as string;

  return (
    <div className="flex h-full items-center justify-center">
      <SessionProvider>
        <AccountOnboarding providerEmail={providerEmail} />
      </SessionProvider>
    </div>
  );
}
