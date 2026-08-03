"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Users } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { setActiveChild } from "@/lib/demo/actions";
import { teamChannelFor } from "@/lib/demo/chat";
import { invoices } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

export interface ChildOption {
  id: string;
  name: string;
  initials: string;
  hue: number;
  sport: string;
}

/** P2 — what needs a parent's eyes for one child: unread chat messages plus
 *  invoices that are due now or overdue. Deterministic, straight from seeds. */
function attentionFor(athleteId: string): {
  unread: number;
  invoicesDue: number;
  total: number;
} {
  const unread = teamChannelFor(athleteId).unread;
  const invoicesDue = invoices.filter(
    (i) =>
      i.athleteId === athleteId &&
      (i.status === "overdue" || i.status === "due"),
  ).length;
  return { unread, invoicesDue, total: unread + invoicesDue };
}

function attentionTitle(a: { unread: number; invoicesDue: number }): string {
  const parts: string[] = [];
  if (a.unread > 0)
    parts.push(`${a.unread} unread message${a.unread === 1 ? "" : "s"}`);
  if (a.invoicesDue > 0)
    parts.push(`${a.invoicesDue} open invoice${a.invoicesDue === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function CountBadge({
  count,
  title,
  className,
}: {
  count: number;
  title?: string;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      title={title}
      className={cn(
        "tnum flex h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[0.62rem] font-bold text-white",
        className,
      )}
    >
      {count}
    </span>
  );
}

/**
 * Parent accounts manage multiple kids — this top-bar switcher flips the
 * whole athlete portal between them (A1). Round 5: "Managing" wording (P1)
 * and per-child red attention badges (P2 — unread messages + open invoices).
 *
 * Round 8 (P2 bug fix): the header wraps this control in an overflow-x-auto
 * container, which CLIPS absolutely-positioned children — the dropdown
 * "opened" but was invisible, so it read as broken. The menu now portals to
 * <body> and positions off the trigger's rect, escaping the clip entirely.
 */
export function ChildSwitcher({
  childrenOptions,
  activeId,
}: {
  childrenOptions: ChildOption[];
  activeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isPending, startTransition] = useTransition();
  const active =
    childrenOptions.find((c) => c.id === activeId) ?? childrenOptions[0];

  function toggleOpen() {
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPos({
          top: rect.bottom + 6,
          right: Math.max(8, window.innerWidth - rect.right),
        });
      }
    }
    setOpen((v) => !v);
  }

  // Escape closes; any resize/scroll would drift the fixed menu — just close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMove = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  const attention = useMemo(() => {
    const map = new Map<string, ReturnType<typeof attentionFor>>();
    for (const c of childrenOptions) map.set(c.id, attentionFor(c.id));
    return map;
  }, [childrenOptions]);
  const totalAttention = [...attention.values()].reduce(
    (n, a) => n + a.total,
    0,
  );

  if (!active) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Managing ${active.name} — switch child`}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/[0.06] px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-brand/10",
          isPending && "opacity-60",
        )}
      >
        <Users className="h-4 w-4 text-brand-ink" aria-hidden />
        <span className="hidden sm:inline text-xs text-muted-foreground">
          Managing
        </span>
        <span className="max-w-28 truncate font-semibold">
          {active.name.split(" ")[0]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <CountBadge
          count={totalAttention}
          title="Things needing attention across your kids — unread messages and open invoices"
          className="absolute -right-1.5 -top-1.5"
        />
      </button>

      {open && menuPos
        ? createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Your athletes"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-raised"
          >
            {childrenOptions.map((c) => {
              const a = attention.get(c.id);
              return (
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
                    {a ? (
                      <CountBadge count={a.total} title={attentionTitle(a)} />
                    ) : null}
                    {c.id === active.id ? (
                      <Check className="h-4 w-4 text-brand-ink" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>,
        document.body,
      )
        : null}
    </div>
  );
}
