import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

/** KPI tile: big tabular value, label, optional trend delta and icon. */
export function StatTile({
  label,
  value,
  unit,
  delta,
  hint,
  icon: Icon,
  accent = false,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft",
        accent && "bg-brand-sheen",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tnum font-display text-3xl font-extrabold tracking-tight">
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-medium text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold",
              delta.direction === "up" && "text-success",
              delta.direction === "down" && "text-destructive",
              delta.direction === "flat" && "text-muted-foreground",
            )}
          >
            {delta.direction === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : delta.direction === "down" ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : null}
            {delta.value}
          </span>
        ) : null}
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}
