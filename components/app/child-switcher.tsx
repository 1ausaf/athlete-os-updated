"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Users } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { setActiveChild } from "@/lib/demo/actions";
import { cn } from "@/lib/utils";

export interface ChildOption {
  id: string;
  name: string;
  initials: string;
  hue: number;
  sport: string;
}

/**
 * Parent accounts manage multiple kids — this top-bar switcher flips the
 * whole athlete portal between them (A1).
 */
export function ChildSwitcher({
  childrenOptions,
  activeId,
}: {
  childrenOptions: ChildOption[];
  activeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const active =
    childrenOptions.find((c) => c.id === activeId) ?? childrenOptions[0];
  if (!active) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Viewing ${active.name} — switch child`}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/[0.06] px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-brand/10",
          isPending && "opacity-60",
        )}
      >
        <Users className="h-4 w-4 text-brand-ink" aria-hidden />
        <span className="hidden sm:inline text-xs text-muted-foreground">
          Viewing
        </span>
        <span className="max-w-28 truncate font-semibold">
          {active.name.split(" ")[0]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Your kids"
            className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-raised"
          >
            {childrenOptions.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === active.id}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    setOpen(false);
                    if (c.id !== active.id) {
                      startTransition(() => setActiveChild(c.id));
                    }
                  }}
                >
                  <AthleteAvatar initials={c.initials} hue={c.hue} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.sport}
                    </span>
                  </span>
                  {c.id === active.id ? (
                    <Check className="h-4 w-4 text-brand-ink" aria-hidden />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
