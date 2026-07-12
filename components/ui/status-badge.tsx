import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import type { StatusTone } from "@/lib/data/booking-status-labels";
import { cn } from "@/lib/utils";

const toneSurface: Record<StatusTone, string> = {
  ok: "border-emerald-600/20 bg-emerald-500/[0.07] text-emerald-900 shadow-none dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
  warn: "border-amber-600/25 bg-amber-500/[0.08] text-amber-950 shadow-none dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100",
  bad: "",
  neutral: "border-border bg-muted text-muted-foreground shadow-none",
};

export type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "variant"> & {
  tone: StatusTone;
};

/**
 * Booking / payment / roster status — maps semantic tone to token-aware badge styles.
 */
export function StatusBadge({
  tone,
  className,
  ...props
}: StatusBadgeProps) {
  if (tone === "bad") {
    return (
      <Badge variant="destructive" className={cn("shadow-none", className)} {...props} />
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(toneSurface[tone], className)}
      {...props}
    />
  );
}

export type ComplianceBadgeTone = "ok" | "bad" | "neutral";

const complianceSurface: Record<ComplianceBadgeTone, string> = {
  ok: toneSurface.ok,
  bad: "",
  neutral: toneSurface.neutral,
};

export type ComplianceStatusBadgeProps = Omit<
  ComponentProps<typeof Badge>,
  "variant"
> & {
  tone: ComplianceBadgeTone;
};

/** Binary compliance rows (e.g. roster gaps) — same visual language as StatusBadge. */
export function ComplianceStatusBadge({
  tone,
  className,
  ...props
}: ComplianceStatusBadgeProps) {
  if (tone === "bad") {
    return (
      <Badge variant="destructive" className={cn("shadow-none", className)} {...props} />
    );
  }
  if (tone === "neutral") {
    return (
      <Badge
        variant="outline"
        className={cn(complianceSurface.neutral, className)}
        {...props}
      />
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(complianceSurface.ok, className)}
      {...props}
    />
  );
}
