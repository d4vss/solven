import type { Metadata } from "next";
import { headers } from "next/headers";
import { listPlanDefinitions, PLAN_IDS } from "@/lib/plans";
import {
  planBandwidthLabel,
  planMaxFileSizeLabel,
  planPriceLabel,
  planStorageLabel,
  planUploadPerDayLabel,
} from "@/lib/plans/display";
import { auth } from "@/lib/auth";
import { buildAccountPlanPayload } from "@/lib/account/api-plan-json";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Plans",
  description: "Compare Solven plans.",
};

export default async function PlansPage() {
  const plans = listPlanDefinitions().sort(
    (a, b) => PLAN_IDS.indexOf(a.id) - PLAN_IDS.indexOf(b.id),
  );
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const current = userId ? await buildAccountPlanPayload(userId) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-20 md:px-8 md:pt-24">
      <section className="space-y-6 text-[13px] leading-snug text-foreground">
        <header className="space-y-3 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Plans explorer</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Compare storage tiers in one view and choose the plan that matches your workload.
          </p>
          {current ? (
            <div className="rounded border border-border/70 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
              Current plan: <span className="font-mono text-foreground">{current.plan.visual.label}</span>
              {current.renewsAt ? (
                <span> · renews {new Date(current.renewsAt).toLocaleDateString()}</span>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="rounded border border-border bg-card">
          <div className="border-b border-border bg-muted/20 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Plan cards
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className={cn("rounded-xl border border-border bg-card p-3 sm:p-4", p.visual.borderClass)}>
                <p className="text-sm font-medium text-foreground">{p.visual.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{planPriceLabel(p.id)}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li>Storage: {planStorageLabel(p)}</li>
                  <li>Max file size: {planMaxFileSizeLabel(p)}</li>
                  <li>Bandwidth: {planBandwidthLabel(p)}</li>
                  <li>Upload/day: {planUploadPerDayLabel(p)}</li>
                </ul>
                <div className="mt-4">
                  {current?.slug === p.id ? (
                    <span className="rounded border border-border/70 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground">
                      Current
                    </span>
                  ) : p.id !== "free" ? (
                    <span className="rounded border border-border/70 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground">
                      Unavailable in POC
                    </span>
                  ) : (
                    <span className="rounded border border-border/70 bg-muted/25 px-2 py-1 text-[11px] text-muted-foreground">
                      Included
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-border bg-card">
          <div className="border-b border-border bg-muted/20 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Comparison
          </div>
          <p className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground sm:hidden">
            Swipe horizontally to compare plans.
          </p>
          <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/10 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 font-medium">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="px-3 py-2 font-medium">
                    {p.visual.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Price", map: (p: (typeof plans)[number]) => planPriceLabel(p.id) },
                { label: "Storage", map: (p: (typeof plans)[number]) => planStorageLabel(p) },
                { label: "Max file size", map: (p: (typeof plans)[number]) => planMaxFileSizeLabel(p) },
                { label: "Bandwidth", map: (p: (typeof plans)[number]) => planBandwidthLabel(p) },
                { label: "Upload/day", map: (p: (typeof plans)[number]) => planUploadPerDayLabel(p) },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/70 last:border-0 hover:bg-muted/20">
                  <td className="sticky left-0 bg-card px-3 py-2 font-mono text-[12px] text-foreground">
                    {row.label}
                  </td>
                  {plans.map((p) => (
                    <td key={`${row.label}-${p.id}`} className="px-3 py-2 text-muted-foreground">
                      {row.map(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
