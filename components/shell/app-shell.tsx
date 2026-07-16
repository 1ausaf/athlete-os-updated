import Link from "next/link";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PersonaSwitcher } from "@/components/app/persona-switcher";
import { AccentToggle } from "@/components/theme/accent-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { DemoRole } from "@/lib/demo/data";
import { PERSONA_LIST } from "@/lib/demo/session";
import type { AppUser } from "@/types/user";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

const roleHue: Record<string, number> = {
  athlete: 8,
  coach: 150,
  admin: 220,
  owner: 264,
};

export interface AppShellProps {
  nav: ReactNode;
  user: AppUser;
  workspaceLabel: string;
  role: DemoRole;
  children: ReactNode;
}

/**
 * App shell: fixed sidebar on md+, drawer on mobile, sticky glass top bar with
 * the persona switcher + theme toggle. Layout-only.
 */
export function AppShell({
  nav,
  user,
  workspaceLabel,
  role,
  children,
}: AppShellProps) {
  const personaOptions = PERSONA_LIST.map((p) => ({
    key: p.key,
    label: p.label,
    blurb: p.blurb,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/" aria-label="LPS Athletic home">
            <BrandLockup subtitle={workspaceLabel} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-slim">{nav}</div>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[0.7rem] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-brand" />
            <span className="font-mono uppercase tracking-wider">
              Demo environment
            </span>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-64 print:pl-0">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border glass px-4 md:px-8">
          {/* Mobile nav trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-16 items-center border-b border-border px-5">
                <BrandLockup subtitle={workspaceLabel} />
              </div>
              {nav}
            </SheetContent>
          </Sheet>

          <div className="flex md:hidden">
            <BrandLockup subtitle={null} markClassName="h-8 w-8" />
          </div>

          <p className="hidden text-sm font-medium text-muted-foreground md:block">
            {workspaceLabel}
          </p>

          <div className="ml-auto flex items-center gap-2">
            <PersonaSwitcher current={role} options={personaOptions} />
            <AccentToggle />
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
              <div className="flex min-w-0 flex-col text-right">
                <span className="truncate text-sm font-semibold leading-tight">
                  {user.fullName}
                </span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {user.role}
                </span>
              </div>
              <AthleteAvatar
                initials={initials(user.fullName)}
                hue={roleHue[user.role] ?? 220}
                size="md"
              />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
