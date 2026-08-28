"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { BrandLockup, WolfMark } from "@/components/brand/logo";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { PersonaSwitcher } from "@/components/app/persona-switcher";
import { SidebarContext } from "@/components/shell/sidebar-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { DemoRole } from "@/lib/demo/data";
import { PERSONA_LIST } from "@/lib/demo/personas";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

const SIDEBAR_KEY = "aos-sidebar";

// Round 11 (M2): the top bar carries the breadcrumb ("Member Portal / Chat"),
// so pages no longer repeat the portal name above their titles.
const SECTION_TITLES: Record<string, string> = {
  dashboard: "Today",
  training: "Training",
  sessions: "Bookings",
  messages: "Chat",
  nutrition: "Nutrition",
  assessment: "Assessment",
  billing: "Billing",
  profile: "Profile",
  parent: "My Profile",
  // Staff sections
  athletes: "Members",
  teams: "Members",
  programming: "Programs",
  messaging: "Chats",
  analytics: "Analytics",
  intelligence: "Intelligence",
  team: "Team",
};

function sectionTitleFor(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const area = segments[0];
  const section = segments[1];
  if (!section) return null;
  // Staff bookings + member bookings share the "sessions" segment.
  if (area === "staff" && section === "billing") return "Billing";
  return SECTION_TITLES[section] ?? null;
}

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
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Round 10 (R2): the mobile drawer closes after any navigation, and a thin
  // brand progress bar runs while the next page loads.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_KEY) === "collapsed") {
      setCollapsed(true);
    }
  }, []);

  // Arriving on a new route: close the drawer, stop the progress bar.
  useEffect(() => {
    setMobileNavOpen(false);
    setNavigating(false);
  }, [pathname]);

  // Delegate: any same-app link click to a DIFFERENT route starts the bar.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.split("?")[0] === pathname) return;
      setNavigating(true);
    };
    document.addEventListener("click", onClick, true);
    const safety = window.setTimeout(() => setNavigating(false), 8000);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(safety);
    };
  }, [pathname]);

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

  const sectionTitle = sectionTitleFor(pathname);
  const homeHref = (
    role === "parent"
      ? "/parent/dashboard"
      : role === "athlete"
        ? "/athlete/dashboard"
        : "/staff/athletes"
  ) as Parameters<typeof Link>[0]["href"];

  // Round 8 (M2): clicking the header identity opens the right profile.
  const profileHref = (
    role === "parent"
      ? "/athlete/parent"
      : role === "athlete"
        ? "/athlete/profile"
        : "/staff/profile"
  ) as Parameters<typeof Link>[0]["href"];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Round 10 (R2): route-transition indicator — a thin brand bar that
          sweeps while the next page loads. */}
      {navigating ? (
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden"
        >
          <div className="nav-progress h-full w-1/3 rounded-r-full bg-brand" />
        </div>
      ) : null}

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
        {/* Round 14 (V1): backdrop-filter directly on a sticky element breaks
            iOS Safari hit-testing after scroll (menu/tabs stop responding
            until you scroll back up). The blur lives on a non-sticky child
            layer instead, and the header sits above every in-page sticky bar. */}
        <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 md:px-8">
          <div aria-hidden className="glass absolute inset-0 -z-10" />
          {/* Mobile nav trigger */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
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

          {/* Round 11 (M2): breadcrumb "Member Portal / Chat" lives up here so
              pages don't repeat the portal name above their titles. */}
          <p className="hidden items-center gap-1.5 text-sm md:flex">
            <Link
              href={homeHref}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {workspaceLabel}
            </Link>
            {sectionTitle ? (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-semibold">{sectionTitle}</span>
              </>
            ) : null}
          </p>

          {/* min-w-0 + overflow keep the parent controls (child switcher,
              badges) from pushing the page wider than the viewport on phones */}
          <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto">
            {headerExtra}
            <PersonaSwitcher current={role} options={personaOptions} />
            <ThemeToggle />
            {/* Round 8 (M2): the name + avatar go to the profile. */}
            <Link
              href={profileHref}
              className="hidden items-center gap-2.5 rounded-lg border-l border-border py-1 pl-3 pr-1 transition-colors hover:bg-accent/50 sm:flex"
              title="Open your profile"
            >
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
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <div
            className={cn(
              "w-full px-4 pb-8 pt-5 md:px-8 md:pb-10 md:pt-6",
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
