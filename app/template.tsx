"use client";

import { useLayoutEffect, useRef } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      el.style.opacity = "1";
      return;
    }

    // Opacity-only: translateY shifts the painted box and can briefly grow
    // scrollable overflow, which flashes the vertical scrollbar.
    el.style.transition = "none";
    el.style.opacity = "0";
    void el.offsetHeight;
    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.opacity = "1";
    });
  }, []);

  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 flex-col"
      style={{ opacity: 0 }}
    >
      {children}
    </div>
  );
}
