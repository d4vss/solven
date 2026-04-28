import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import {
  CloudUploadIcon,
  FileIcon,
  SparklesIcon,
} from "lucide-react";
import Logo from "@/components/brand/logo";
import { OnboardingView } from "@/components/onboarding/onboarding-view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Solven",
  description:
    "File sharing that feels like a desktop explorer. Upload, organize, and share with secure links.",
};

const homeActionClassName = cn(
  "flex h-auto min-h-14 w-full cursor-pointer items-center justify-center rounded-xl px-4 py-5 text-sm font-medium sm:min-h-16 sm:px-5 sm:py-6",
  // Outline uses a visible border; default used `border-transparent`, so the fill read larger.
  // Same border width + color on both keeps the box aligned.
  "border-2 border-border/80 shadow-none",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user as { username?: string | null } | undefined;
  const needsOnboarding =
    !!user && (user.username == null || user.username === "");

  return (
    <>
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-10 pt-20 md:px-8 md:pt-24">
        <div className="space-y-8">
          <header className="space-y-4 border-b border-border pb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Logo size={18} />
              <span className="text-xs uppercase tracking-widest">
                Solven explorer
              </span>
            </div>
            <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              File sharing that feels like a desktop explorer.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Upload, organize, share, and control downloads with plan-based
              limits and secure public links.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                type="button"
                variant="default"
                className={homeActionClassName}
              >
                <Link href="/account">
                  <CloudUploadIcon className="size-4" />
                  Open storage
                </Link>
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className={homeActionClassName}
              >
                <Link href="/plans">
                  <SparklesIcon className="size-4" />
                  Compare plans
                </Link>
              </Button>
            </div>
          </header>
        </div>

        <div className="mt-2 rounded border border-border bg-card">
          <div className="flex items-center border-b border-border bg-muted/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Explorer preview
            </p>
          </div>
          <div className="overflow-x-auto">
            <p className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground sm:hidden">
              Swipe horizontally to view all columns.
            </p>
            <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Downloads</th>
                  <th className="px-3 py-2 font-medium">Last download</th>
                  <th className="px-3 py-2 font-medium">Expires in</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "Client handoff",
                    size: "—",
                    downloads: "—",
                    lastDownload: "—",
                    expiresIn: "—",
                  },
                  {
                    name: "brand-assets.zip",
                    size: "248 MB",
                    downloads: "126",
                    lastDownload: "12m ago",
                    expiresIn: "90d",
                  },
                  {
                    name: "launch_notes.md",
                    size: "18 KB",
                    downloads: "9",
                    lastDownload: "1h ago",
                    expiresIn: "14d",
                  },
                ].map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2 font-mono text-[12px]">
                        <FileIcon className="size-3.5 text-muted-foreground" />
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.size}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.downloads}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.lastDownload}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.expiresIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {needsOnboarding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <OnboardingView mode="dialog" />
        </div>
      ) : null}
    </>
  );
}
