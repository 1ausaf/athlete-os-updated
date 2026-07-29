"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { BrandLockup, WolfMark } from "@/components/brand/logo";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PersonaSwitcher } from "@/components/app/persona-switcher";
import { SidebarContext } from "@/components/shell/sidebar-context";
import { AccentToggle } from "@/components/theme/accent-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { DemoRole } from "@/lib/demo/data";
import { PERSONA_LIST } from "@/lib/demo/personas";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

const SIDEBAR_KEY = "aos-sidebar";

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
  parent: 32,
};

export interface AppShellProps {
  nav: ReactNode;
  user: AppUser;
  workspaceLabel: string;
  role: DemoRole;
  /** Extra element rendered beside the persona switcher (e.g. child switcher). */
  headerExtra?: ReactNode;
  /** Staff workspace runs edge-to-edge; the athlete portal stays centered. */
  fullWidth?: boolean;
  children: ReactNode;
}

/**
 * App shell: collapsible fixed sidebar on md+, drawer on mobile, sticky glass
 * top bar with the persona switcher + theme toggle. Layout-only.
 */
export function AppShell({
  nav,
  user,
  workspaceLabel,
  role,
  headerExtra,
  fullWidth = false,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_KEY) === "collapsed") {
      setCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "open");
      return next;
    });
  };

  const personaOptions = PERSONA_LIST.map((p) => ({
    key: p.key,
    label: p.label,
    blurb: p.blurb,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border",
            collapsed ? "justify-center px-0" : "px-5",
          )}
        >
          <Link href="/" aria-label="LPS Athletic home">
            {collapsed ? (
              <WolfMark className="h-8 w-8" />
            ) : (
              <BrandLockup subtitle={workspaceLabel} />
            )}
          </Link>
        </div>
        <SidebarContext.Provider value={{ collapsed }}>
          <div className="flex-1 overflow-y-auto scrollbar-slim">{nav}</div>
        </SidebarContext.Provider>
        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-4")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "mb-2 w-full justify-center gap-2 text-muted-foreground",
              !collapsed && "justify-start px-3",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" aria-hidden />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
          {collapsed ? (
            <div
              className="flex justify-center py-1"
              title="Demo environment"
            >
              <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-brand" />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[0.7rem] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-brand" />
              <span className="font-mono uppercase tracking-wider">
                Demo environment
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-200 print:pl-0",
          collapsed ? "md:pl-16" : "md:pl-64",
        )}
      >
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

          {/* min-w-0 + overflow keep the parent controls (child switcher,
              badges) from pushing the page wider than the viewport on phones */}
          <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto">
            {headerExtra}
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
          <div
            className={cn(
              "w-full px-4 py-8 md:px-8 md:py-10",
              !fullWidth && "mx-auto max-w-6xl",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
