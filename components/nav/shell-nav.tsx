"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ShellNavItem {
  href: Route;
  label: string;
  icon?: LucideIcon;
  description?: string;
  badge?: number;
  /** Small text pill next to the label (e.g. "Pro", "New"). */
  tag?: string;
  /** Grayed-out upsell state (e.g. Nutrition before upgrading). */
  locked?: boolean;
}

export interface ShellNavProps {
  title: string;
  subtitle?: string;
  items: ShellNavItem[];
}

/**
 * Sidebar nav shared by the athlete portal and staff workspace. Active items
 * get a volt indicator bar + raised tile; role filtering happens upstream.
 */
export function ShellNav({ title, subtitle, items }: ShellNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label={`${title} navigation`}>
      <p className="px-3 pb-2 pt-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground/70">
        {title}
      </p>

      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand" />
                ) : null}
                {Icon ? (
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                      active
                        ? "border-brand/30 bg-brand/10 text-brand-ink"
                        : "border-transparent bg-muted/60 text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                ) : null}
                <span className={cn("flex-1", item.locked && "opacity-50")}>
                  {item.label}
                </span>
                {item.tag ? (
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wide text-brand-ink">
                    {item.tag}
                  </span>
                ) : null}
                {item.badge ? (
                  <span className="tnum flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1.5 text-[0.65rem] font-bold text-brand-foreground">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
