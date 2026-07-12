"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Search, Trophy } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Progress } from "@/components/app/progress";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import type { Athlete } from "@/lib/demo/data";
import { billingMeta, seasonMeta } from "@/lib/demo/status";

/**
 * Client-side roster with a name/sport search box. Filtering is local state
 * only — the full roster is passed down from the server component.
 */
export function RosterFilter({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.sport.toLowerCase().includes(q) ||
        a.coach.toLowerCase().includes(q),
    );
  }, [athletes, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search athletes, sport, or coach…"
          className="pl-9"
          aria-label="Search roster"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 p-6 text-center text-sm text-muted-foreground">
          No athletes match “{query}”.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <RosterRow key={a.id} athlete={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function RosterRow({ athlete }: { athlete: Athlete }) {
  const billing = billingMeta[athlete.billing.state];
  const season = seasonMeta[athlete.season];
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );
  const newPr = athlete.prs.find((p) => p.isNew);
  const href = `/staff/athletes/${athlete.id}` as Route;

  return (
    <Link
      href={href}
      className="group grid items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-brand/40 hover:bg-accent/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_auto]"
    >
      {/* Identity */}
      <div className="flex items-center gap-3">
        <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold">{athlete.name}</span>
            {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {athlete.sport} · {athlete.planName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={billing.tone} dot>
              {billing.label}
            </Pill>
            <Pill tone={season.tone}>{season.label}</Pill>
            {athlete.injuryFlags.length > 0 ? (
              <Pill tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>
                Injury flag
              </Pill>
            ) : null}
            {newPr ? (
              <Pill tone="success" icon={<Trophy className="h-3 w-3" />}>
                New PR
              </Pill>
            ) : null}
          </div>
        </div>
      </div>

      {/* Program progress */}
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="truncate font-medium">{athlete.program.name}</span>
          <span className="tnum shrink-0 text-muted-foreground">
            Day {athlete.program.day}/{athlete.program.totalDays}
          </span>
        </div>
        <Progress value={progressPct} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {athlete.program.phase} · {athlete.frequency}
        </p>
      </div>

      {/* Attendance */}
      <div className="flex items-center gap-6 md:justify-end">
        <div className="text-right">
          <div className="tnum font-display text-2xl font-extrabold leading-none">
            {athlete.attendancePct}
            <span className="ml-0.5 text-sm font-medium text-muted-foreground">
              %
            </span>
          </div>
          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            Attendance
          </p>
        </div>
      </div>
    </Link>
  );
}
