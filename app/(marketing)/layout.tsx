import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { EnterDemoButton } from "@/components/app/enter-demo";
import { BrandLockup } from "@/components/brand/logo";
import { AccentToggle } from "@/components/theme/accent-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border glass">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link href="/" aria-label="LPS Athletic home">
            <BrandLockup subtitle="Athlete OS" />
          </Link>

          <nav className="ml-6 hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            <Link href="/about" className="transition-colors hover:text-foreground">
              About
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link
              href={"/style-guide" as Route}
              className="transition-colors hover:text-foreground"
            >
              Design system
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AccentToggle />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <EnterDemoButton role="athlete" variant="brand" size="sm">
              Launch demo
            </EnterDemoButton>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <BrandLockup subtitle="Athlete OS" />
              <p className="mt-3 text-sm text-muted-foreground">
                The operating system for LPS Athletic — The Pro Maker™. Built for
                semi-private coaching and individualized programming.
              </p>
            </div>
            <div className="flex flex-wrap gap-12 text-sm">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Platform</span>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  About
                </Link>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                  Pricing
                </Link>
                <Link
                  href={"/style-guide" as Route}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Design system
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Compliance</span>
                <span className="text-muted-foreground">Safe-Sport Rule of Two</span>
                <span className="text-muted-foreground">Audit-logged messaging</span>
                <span className="text-muted-foreground">Role-based access</span>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} LPS Athletic · North York, Ontario</span>
            <span className="font-mono uppercase tracking-wider">
              Concept demo · no real payment data
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
