import Link from "next/link";
import type { ReactNode } from "react";

import { EnterDemoButton } from "@/components/app/enter-demo";
import { PowaLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * POWA Coach platform surface (apex + demo hosts). The product inside stays
 * tenant-branded — LPS Athletic on this deployment — but the storefront is
 * the platform's own.
 */
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Round 14 (V1): blur on a non-sticky child — backdrop-filter on the
          sticky element itself breaks iOS Safari hit-testing after scroll. */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80">
        <div aria-hidden className="glass absolute inset-0 -z-10" />
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link href="/" aria-label="POWA Coach home">
            <PowaLockup subtitle="Athlete OS" />
          </Link>

          <div className="ml-auto flex items-center gap-2">
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
              <PowaLockup subtitle="Athlete OS" />
              <p className="mt-3 text-sm text-muted-foreground">
                The white-label operating system for athlete-development
                businesses — programming, booking, billing and Safe-Sport
                messaging under your own brand.
              </p>
            </div>
            <div className="flex flex-wrap gap-12 text-sm">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Platform</span>
                <Link
                  href="/auth/sign-in"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </Link>
                <span className="text-muted-foreground">
                  White-label branding
                </span>
                <span className="text-muted-foreground">Custom domains</span>
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
            <span>
              © {new Date().getFullYear()} POWA Coach · Flagship facility: LPS
              Athletic — The Pro Maker™, North York, Ontario
            </span>
            <span className="font-mono uppercase tracking-wider">
              Concept demo · no real payment data
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
