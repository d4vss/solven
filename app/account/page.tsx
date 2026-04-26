import { headers } from "next/headers";
import { AccountExplorer } from "@/components/account/account-explorer";
import { buildAccountPlanPayload } from "@/lib/account/api-plan-json";
import { auth } from "@/lib/auth";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  const initialPlan = userId ? await buildAccountPlanPayload(userId) : null;

  return (
    <div className="space-y-6 pt-8 md:pt-16">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          Storage explorer
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Organize files and folders, create share links, and manage downloads from one place.
        </p>
      </header>

      <div className="rounded border border-border bg-card p-4 md:p-5">
        <AccountExplorer initialPlan={initialPlan} />
      </div>
    </div>
  );
}
