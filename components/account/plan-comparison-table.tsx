"use client";

import type { AccountPlanPayload } from "@/lib/account/api-plan-json";
import {
  planBandwidthLabel,
  planMaxFileSizeLabel,
  planPriceLabel,
  planStorageLabel,
  planUploadPerDayLabel,
} from "@/lib/plans/display";

const ROWS = [
  { label: "Price / month", map: (p: AccountPlanPayload["catalog"][number]) => planPriceLabel(p.id) },
  { label: "Storage", map: (p: AccountPlanPayload["catalog"][number]) => planStorageLabel(p) },
  { label: "Max file size", map: (p: AccountPlanPayload["catalog"][number]) => planMaxFileSizeLabel(p) },
  { label: "Bandwidth", map: (p: AccountPlanPayload["catalog"][number]) => planBandwidthLabel(p) },
  { label: "Upload/day", map: (p: AccountPlanPayload["catalog"][number]) => planUploadPerDayLabel(p) },
];

export function PlanComparisonTable({
  catalog,
}: {
  catalog: AccountPlanPayload["catalog"];
}) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-border bg-muted/25">
            <th className="sticky left-0 z-[1] bg-muted/90 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
              Feature
            </th>
            {catalog.map((p) => (
              <th
                key={p.id}
                className="min-w-[10rem] px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {p.visual.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.label}
              className="border-b border-border/70 last:border-0 hover:bg-muted/15"
            >
              <td className="sticky left-0 z-[1] bg-background/95 px-3 py-2 text-muted-foreground backdrop-blur-sm">
                {row.label}
              </td>
              {catalog.map((p) => (
                <td
                  key={`${p.id}-${row.label}`}
                  className="px-3 py-2 text-foreground/90"
                >
                  {row.map(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        Bandwidth and daily upload limits are fixed plan figures shown above.
      </p>
    </div>
  );
}
