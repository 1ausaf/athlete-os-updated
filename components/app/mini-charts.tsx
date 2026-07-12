import { cn } from "@/lib/utils";

/** Lightweight SVG bar series (no dependencies). */
export function BarSeries({
  data,
  labels,
  height = 120,
  className,
  highlightLast = true,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  className?: string;
  highlightLast?: boolean;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className={cn("flex items-end gap-2", className)} style={{ height }}>
      {data.map((v, i) => {
        const h = Math.max(4, (v / max) * (height - 20));
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-full rounded-t-md transition-all",
                highlightLast && isLast ? "bg-brand" : "bg-muted-foreground/25",
              )}
              style={{ height: h }}
            />
            {labels ? (
              <span className="text-[0.6rem] text-muted-foreground">
                {labels[i]}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Minimal sparkline for compact trend hints. */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      fill="none"
    >
      <polyline
        points={pts}
        className="stroke-brand"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
