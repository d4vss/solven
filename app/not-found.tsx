import Link from "next/link";
import Logo from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex w-full flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
      <div className="flex max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size={44} />
          <p className="font-mono text-7xl font-semibold tracking-tighter text-foreground/90 sm:text-8xl">
            404
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            This page does not exist
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The link may be broken, or the page was removed. Check the URL or
            head back to Solven.
          </p>
        </div>
        <Button asChild className="rounded-xl px-8">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </section>
  );
}
