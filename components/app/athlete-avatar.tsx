import { cn } from "@/lib/utils";

/**
 * Deterministic gradient avatar keyed by an athlete's hue, with initials.
 * Gives the rosters a lively, branded feel without external images.
 */
export function AthleteAvatar({
  initials,
  hue,
  size = "md",
  className,
  ring = false,
}: {
  initials: string;
  hue: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}) {
  const dim = {
    sm: "h-8 w-8 text-[0.65rem]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-16 w-16 text-lg",
  }[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        ring && "ring-2 ring-background",
        dim,
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 72% 52%), hsl(${
          (hue + 45) % 360
        } 68% 38%))`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
