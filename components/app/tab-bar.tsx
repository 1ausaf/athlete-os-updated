"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The app-wide "line" tab style (round 5: "I think the line is nice… we
 * should keep it consistent through the entire thing"). Two flavors:
 * button tabs (client state) and link tabs (URL state).
 */

export interface TabSpec<T extends string = string> {
  value: T;
  label: string;
  /** Bracketed count — reacts to filters where relevant (CM9). */
  count?: number;
}

export function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
  className,
  right,
}: {
  tabs: TabSpec<T>[];
  active: T;
  onSelect: (value: T) => void;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onSelect(t.value)}
          aria-pressed={active === t.value}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            active === t.value
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count != null ? (
            <span className="tnum text-xs text-muted-foreground">({t.count})</span>
          ) : null}
        </button>
      ))}
      {right ? <div className="ml-auto shrink-0 pb-1 pl-2">{right}</div> : null}
    </div>
  );
}

export function TabLinkBar({
  tabs,
  className,
}: {
  tabs: { href: Route; label: string; active: boolean; count?: number }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-border",
        className,
      )}
    >
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            t.active
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {t.count != null ? (
            <span className="tnum text-xs text-muted-foreground">({t.count})</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
