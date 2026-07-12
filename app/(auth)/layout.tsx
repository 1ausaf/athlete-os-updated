import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLockup, WolfMark } from "@/components/brand/logo";
import { AccentToggle } from "@/components/theme/accent-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-[420px] w-[420px] volt-halo" />
        <div className="relative flex items-center gap-2 p-8">
          <Link href="/">
            <BrandLockup subtitle="Athlete OS" />
          </Link>
        </div>
        <div className="relative mt-auto flex flex-col gap-6 p-10">
          <WolfMark className="h-14 w-14" />
          <h2 className="max-w-md text-balance text-3xl font-extrabold leading-tight">
            Relentlessly create unfair advantages.
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            One system for individualized programming, frequency-aware booking,
            Safe-Sport messaging and the coach huddle brief.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 font-display text-sm font-bold text-foreground/60">
            {["ESPN", "TSN", "CBC", "HBO"].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Content panel */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <BrandLockup subtitle={null} />
          </Link>
          <span className="flex items-center gap-1">
            <AccentToggle />
            <ThemeToggle />
          </span>
        </div>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
