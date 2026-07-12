import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PillTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneClass: Record<PillTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  brand: "border-brand/30 bg-brand/10 text-brand-ink",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
};

/** Compact status chip with a semantic tone and optional leading dot/icon. */
export function Pill({
  tone = "neutral",
  dot = false,
  icon,
  className,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      ) : null}
      {icon}
      {children}
    </span>
  );
}
