"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Search, Trophy } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Progress } from "@/components/app/progress";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { bucketLabel, type Athlete, type MemberBucket } from "@/lib/demo/data";
import { billingMeta, seasonMeta } from "@/lib/demo/status";

import { programDueMeta } from "./program-due";

/** Trello list order from the client's board. */
const BUCKET_ORDER: MemberBucket[] = [
  "in-gym",
  "private",
  "program-only",
  "online",
  "away",
];

type BucketFilter = MemberBucket | "all";

/**
 * Client-side roster board: bucket chip filters (the client's Trello lists)
 * plus a name/sport/coach search. All filtering is local state — the full
 * roster is passed down from the server component.
 */
export function RosterFilter({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<BucketFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return athletes.filter((a) => {
      if (bucket !== "all" && a.bucket !== bucket) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.sport.toLowerCase().includes(q) ||
        a.coach.toLowerCase().includes(q)
      );
    });
  }, [athletes, query, bucket]);

  // Group the filtered roster by bucket, in board order (Trello lists).
  const groups = useMemo(
    () =>
      BUCKET_ORDER.map((b) => ({
        bucket: b,
        rows: filtered.filter((a) => a.bucket === b),
      })).filter((g) => g.rows.length > 0),
    [filtered],
  );

  const countFor = (b: BucketFilter) =>
    b === "all"
      ? athletes.length
      : athletes.filter((a) => a.bucket === b).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Search + bucket chips */}
      <div className="flex flex-col gap-3">
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
        <div className="flex flex-wrap gap-1.5">
          <BucketChip
            active={bucket === "all"}
            label="All"
            count={countFor("all")}
            onClick={() => setBucket("all")}
          />
          {BUCKET_ORDER.map((b) => (
            <BucketChip
              key={b}
              active={bucket === b}
              label={bucketLabel[b]}
              count={countFor(b)}
              onClick={() => setBucket(b)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 p-6 text-center text-sm text-muted-foreground">
          No athletes match{query.trim() ? <> “{query}”</> : null}
          {bucket !== "all" ? <> in {bucketLabel[bucket]}</> : null}.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.bucket} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <h2 className="eyebrow">{bucketLabel[g.bucket]}</h2>
                <span className="tnum text-xs text-muted-foreground">
                  {g.rows.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {g.rows.map((a) => (
                  <RosterRow key={a.id} athlete={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function BucketChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand/10 text-brand-ink"
          : "border-border bg-surface/50 text-muted-foreground hover:border-brand/30 hover:text-foreground",
      )}
    >
      {label}
      <span className="tnum opacity-70">{count}</span>
    </button>
  );
}

function RosterRow({ athlete }: { athlete: Athlete }) {
  const billing = billingMeta[athlete.billing.state];
  const season = seasonMeta[athlete.season];
  const due = programDueMeta(athlete.programDueInDays);
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
      {/* Identity — card-title format: NAME [Sport, Sex, YOB] */}
      <div className="flex items-center gap-3">
        <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold">{athlete.name}</span>
            {athlete.isMinor ? <Pill tone="info">Minor</Pill> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            [{athlete.sport}, {athlete.gender}, {athlete.yearOfBirth}] ·{" "}
            {athlete.planName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {due.tone !== "neutral" ? (
              <Pill tone={due.tone} dot>
                {due.label}
              </Pill>
            ) : null}
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
