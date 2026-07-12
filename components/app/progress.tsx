import { cn } from "@/lib/utils";

/** Thin progress track with a volt fill. `value` is 0–100. */
export function Progress({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "success" | "warning" | "muted";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    muted: "bg-muted-foreground/40",
  }[tone];
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Circular progress ring (SVG). `value` 0–100. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-brand transition-all"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-sm font-bold">{Math.round(clamped)}%</span>
        {label ? (
          <span className="text-[0.6rem] text-muted-foreground">{label}</span>
        ) : null}
      </span>
    </div>
  );
}
