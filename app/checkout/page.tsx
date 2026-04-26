import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Plan checkout placeholder.",
};

type PageProps = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  await searchParams;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-20 md:px-8 md:py-24">
      <div className="space-y-6 text-[13px] leading-snug text-foreground">
        <header className="border-b border-border pb-6">
          <h1 className="text-lg font-medium tracking-tight">Checkout disabled</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments are disabled in this proof-of-concept build.
          </p>
        </header>

        <div className="rounded border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            You can keep using the Free plan limits for demo purposes.
          </p>
          <div className="mt-3">
            <Link className="underline text-sm" href="/plans">
              Back to plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
