"use client";

import { TooltipProvider } from "@/components/ui/tooltip";

export function TooltipRootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
