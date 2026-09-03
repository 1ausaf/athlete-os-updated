import Link from "next/link";
import { Home, LogIn } from "lucide-react";

import { WolfMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[380px] w-[640px] -translate-x-1/2 volt-halo" />

      <div className="relative flex flex-col items-center gap-6">
        <WolfMark className="h-16 w-16" />

        <Pill tone="brand" dot>
          404 · Off the roster
        </Pill>

        <h1 className="max-w-2xl text-balance font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          You&apos;re off the roster.
        </h1>

        <p className="max-w-md text-pretty text-muted-foreground">
          This page isn&apos;t on the board. It may have been moved, retired, or
          never made the cut. Let&apos;s get you back on the floor.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button asChild variant="brand" size="lg">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/sign-in">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
