"use client";

import { useMemo, useState } from "react";

import { BarSeries } from "@/components/app/mini-charts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { money, revenueTrend } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/** Deterministic day-of-week weights (sums to 1) — splits a weekly total into
 *  plausible daily collections for the 24h / 1-week views. */
const DAILY_SPLIT = [0.13, 0.15, 0.16, 0.14, 0.17, 0.15, 0.1];

type PeriodKey = "24h" | "1w" | "1m" | "custom";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "24h", label: "24 h" },
  { key: "1w", label: "1 week" },
  { key: "1m", label: "1 month" },
  { key: "custom", label: "Custom" },
];

const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Weekday labels for the last 7 days, oldest → today. */
function lastSevenDayLabels(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    weekday.format(new Date(Date.now() - (6 - i) * DAY_MS)),
  );
}

/**
 * O1 — revenue over a chosen period: Last 24h / 1 week / 1 month / custom
 * range. Totals and the bar trend derive from the same 8-week revenue seed,
 * scaled to the selection.
 */
export function RevenuePanel() {
  const [period, setPeriod] = useState<PeriodKey>("1m");
  const [fromInput, setFromInput] = useState(() =>
    toInputDate(new Date(Date.now() - 13 * DAY_MS)),
  );
  const [toInput, setToInput] = useState(() => toInputDate(new Date()));

  const view = useMemo(() => {
    const lastWeek = revenueTrend[revenueTrend.length - 1] ?? 0;
    const prevWeek = revenueTrend[revenueTrend.length - 2] ?? lastWeek;
    const last4 = revenueTrend.slice(-4).reduce((a, b) => a + b, 0);
    const prev4 =
      revenueTrend.slice(-8, -4).reduce((a, b) => a + b, 0) || last4;
    const wow = prevWeek > 0 ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0;
    const mom = prev4 > 0 ? ((last4 - prev4) / prev4) * 100 : 0;
    const dailyBars = DAILY_SPLIT.map((w) => Math.round(lastWeek * w));

    if (period === "24h") {
      const today = lastWeek * DAILY_SPLIT[6]!;
      const yesterday = lastWeek * DAILY_SPLIT[5]!;
      return {
        label: "Last 24 hours",
        total: Math.round(lastWeek / 7),
        deltaPct: Math.round(((today - yesterday) / yesterday) * 100),
        deltaLabel: "vs yesterday",
        bars: dailyBars,
        barLabels: lastSevenDayLabels(),
        caption: "Daily collections across the current week — today highlighted.",
      };
    }
    if (period === "1w") {
      return {
        label: "Last 7 days",
        total: lastWeek,
        deltaPct: Math.round(wow),
        deltaLabel: "week over week",
        bars: dailyBars,
        barLabels: lastSevenDayLabels(),
        caption: "This week's collections, day by day.",
      };
    }
    if (period === "1m") {
      return {
        label: "Last 4 weeks",
        total: last4,
        deltaPct: Math.round(mom),
        deltaLabel: "vs the 4 weeks before",
        bars: revenueTrend.slice(-4),
        barLabels: ["W5", "W6", "W7", "W8"],
        caption: "Weekly collections over the last 4 weeks.",
      };
    }

    // Custom range — proportional to the average daily take of the last month.
    const from = new Date(`${fromInput}T00:00:00`).getTime();
    const to = new Date(`${toInput}T23:59:59`).getTime();
    const valid = !Number.isNaN(from) && !Number.isNaN(to);
    const days = valid
      ? Math.max(1, Math.round((Math.max(from, to) - Math.min(from, to)) / DAY_MS) + 1)
      : 14;
    const dailyAvg = last4 / 28;
    const bars =
      days <= 14
        ? Array.from({ length: days }, (_, i) =>
            Math.round(dailyAvg * 7 * DAILY_SPLIT[i % 7]!),
          )
        : revenueTrend.slice(-Math.min(8, Math.ceil(days / 7)));
    return {
      label: valid
        ? `${shortDay.format(Math.min(from, to))} – ${shortDay.format(Math.max(from, to))}`
        : "Custom range",
      total: Math.round(dailyAvg * days),
      deltaPct: Math.round(mom),
      deltaLabel: "vs prior period",
      bars,
      barLabels: undefined,
      caption: `${days} day${days === 1 ? "" : "s"} at the current run rate.`,
    };
  }, [period, fromInput, toInput]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="eyebrow">Revenue</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tnum font-display text-3xl font-extrabold tracking-tight">
                {money(view.total)}
              </span>
              <span className="text-sm text-muted-foreground">
                collected · {view.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {PERIODS.map(({ key, label }) => {
                const active = period === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriod(key)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand text-brand-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {period === "custom" ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={fromInput}
                  aria-label="Revenue range start date"
                  onChange={(e) => setFromInput(e.target.value)}
                  className="h-9 w-[8.75rem]"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={toInput}
                  aria-label="Revenue range end date"
                  onChange={(e) => setToInput(e.target.value)}
                  className="h-9 w-[8.75rem]"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{view.caption}</p>
          <Pill tone={view.deltaPct >= 0 ? "success" : "danger"} dot>
            {view.deltaPct >= 0 ? "+" : ""}
            {view.deltaPct}% {view.deltaLabel}
          </Pill>
        </div>
        <BarSeries data={view.bars} labels={view.barLabels} height={160} />
      </CardContent>
    </Card>
  );
}
