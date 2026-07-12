import { cn } from "@/lib/utils";

/**
 * LPS "wolf" mark — a geometric apex-predator head rendered in a rounded tile.
 * The muzzle/negative space is cut with the surface color; the eyes glow volt.
 */
export function WolfMark({
  className,
  glow = true,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl bg-foreground text-background",
        glow && "shadow-[0_6px_20px_-8px_hsl(var(--foreground)/0.6)]",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-[62%] w-[62%]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* head silhouette */}
        <path
          d="M16 3.5 5.5 8v7.5c0 6.4 4.6 10.6 10.5 13 5.9-2.4 10.5-6.6 10.5-13V8L16 3.5Z"
          fill="currentColor"
        />
        {/* muzzle notch (negative space) */}
        <path
          d="M16 20.5 12.5 16.2h7L16 20.5Z"
          className="fill-foreground"
        />
        {/* eyes */}
        <path d="M11 12.2 13.4 11l.6 2.4-2.6.3-.4-1.5Z" fill="hsl(var(--brand))" />
        <path d="M21 12.2 18.6 11l-.6 2.4 2.6.3.4-1.5Z" fill="hsl(var(--brand))" />
      </svg>
    </span>
  );
}

/** Full lockup: mark + wordmark, with the "AOS" system suffix. */
export function BrandLockup({
  className,
  subtitle = "Athlete OS",
  markClassName = "h-8 w-8",
}: {
  className?: string;
  subtitle?: string | null;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <WolfMark className={markClassName} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.95rem] font-extrabold uppercase tracking-tight">
          LPS Athletic
        </span>
        {subtitle ? (
          <span className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
