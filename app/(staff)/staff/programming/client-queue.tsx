"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Users } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { athletes, bucketLabel, relTime, type Athlete } from "@/lib/demo/data";
import { assignmentsForAthlete, staffById, staffMembers } from "@/lib/demo/staff";
import {
  groupPhase,
  templateForProgramName,
  trainingGroups,
  type TrainingGroup,
} from "@/lib/demo/training";

/** Runway pill for the programming queue — 0 days = a program is due now. */
function runwayPill(days: number) {
  if (days === 0)
    return (
      <Pill tone="danger" dot>
        Due now
      </Pill>
    );
  if (days <= 5)
    return (
      <Pill tone="warning" dot>
        Due in {days}d
      </Pill>
    );
  return <Pill tone="neutral">{days}d runway</Pill>;
}

/** The coach who writes this athlete's training — the PROGRAMMING assignment (C7/C9). */
function programmingCoachIdFor(athleteId: string): string | undefined {
  return assignmentsForAthlete(athleteId).find((a) => a.role === "programming")
    ?.staffId;
}

/** Coaches that actually hold a programming assignment — the filter options. */
const programmingCoaches = staffMembers.filter((s) =>
  athletes.some((a) => programmingCoachIdFor(a.id) === s.id),
);

/**
 * Client queue (C9/C12/C13): every client — individual athletes AND teams —
 * sorted by program runway, filterable by responsible (programming) coach.
 */
export function ClientQueue({ viewerId }: { viewerId: string }) {
  const [coachFilter, setCoachFilter] = useState<string>("all");

  const queue = useMemo(() => {
    // Away/paused/inactive members have no program runway — active only (R4).
    const sorted = athletes
      .filter((a) => a.status === "active")
      .sort((a, b) => a.programDueInDays - b.programDueInDays);
    if (coachFilter === "all") return sorted;
    const target = coachFilter === "mine" ? viewerId : coachFilter;
    return sorted.filter((a) => programmingCoachIdFor(a.id) === target);
  }, [coachFilter, viewerId]);

  const filterName =
    coachFilter === "mine" ? "you" : staffById(coachFilter)?.name ?? "";
  const showTeams = coachFilter === "all";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Sorted by program runway — a client hits zero when their last
          published day is trained. Write the next block before they run out.
        </p>
        <Select value={coachFilter} onValueChange={setCoachFilter}>
          <SelectTrigger
            className="w-full sm:w-52"
            aria-label="Filter by responsible coach"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All coaches</SelectItem>
            <SelectItem value="mine">Only mine</SelectItem>
            {programmingCoaches.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {queue.map((a) => (
        <QueueRow key={a.id} athlete={a} />
      ))}
      {queue.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted-foreground">
          No clients with {filterName || "that coach"} as programming coach.
        </p>
      ) : null}

      {/* Teams appear as clients too (C12) — one shared program each */}
      {showTeams ? (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">Teams</span>
            <span className="text-xs text-muted-foreground">
              Teams are clients too — one program, many athletes.
            </span>
          </div>
          {trainingGroups.map((g) => (
            <TeamRow key={g.id} group={g} />
          ))}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Team clients are listed under &ldquo;All coaches&rdquo;.
        </p>
      )}
    </div>
  );
}

function QueueRow({ athlete }: { athlete: Athlete }) {
  const builderHref = `/staff/athletes/${athlete.id}/program` as Route;
  const progressPct = Math.round(
    (athlete.program.day / athlete.program.totalDays) * 100,
  );
  const progCoach = staffById(programmingCoachIdFor(athlete.id) ?? "");

  return (
    <Card>
      <CardContent className="grid items-center gap-4 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_auto_auto]">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold">{athlete.name}</span>
              <Pill tone="neutral">{bucketLabel[athlete.bucket]}</Pill>
            </div>
            <p className="text-sm text-muted-foreground">
              {athlete.sport} · Programming:{" "}
              {progCoach?.name ?? athlete.coach}
            </p>
          </div>
        </div>

        {/* Current program */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{athlete.program.name}</span>
            <span className="tnum shrink-0 text-muted-foreground">
              Day {athlete.program.day}/{athlete.program.totalDays}
            </span>
          </div>
          <Progress value={progressPct} />
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Pill tone="info">{athlete.program.phase}</Pill>
            <span className="text-xs text-muted-foreground">
              {athlete.frequency}
            </span>
          </div>
        </div>

        {/* Runway */}
        <div className="md:justify-self-end">{runwayPill(athlete.programDueInDays)}</div>

        {/* Action */}
        <Button asChild variant="outline" size="sm" className="md:justify-self-end">
          <Link href={builderHref}>Open builder</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** A team styled as a client row — "Tigers HPP [A] · Team · 12 athletes" (C12). */
function TeamRow({ group }: { group: TrainingGroup }) {
  const tpl = templateForProgramName(group.program);
  const href = tpl
    ? (`/staff/programming/templates/${tpl.id}` as Route)
    : ("/staff/programming" as Route);
  const phase = groupPhase[group.id];
  const pct = Math.round((group.compliance.filled / group.compliance.total) * 100);

  return (
    <Card>
      <CardContent className="grid items-center gap-4 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_auto_auto]">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-bold">{group.name}</span>
              <Pill tone="brand">Team</Pill>
            </div>
            <p className="text-sm text-muted-foreground">
              {group.athleteCount} athletes · one shared program
            </p>
          </div>
        </div>

        {/* Shared program */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{group.program}</span>
            <span className="tnum shrink-0 text-muted-foreground">
              {group.compliance.filled}/{group.compliance.total} filled
            </span>
          </div>
          <Progress value={pct} />
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {phase ? <Pill tone="info">{phase}</Pill> : null}
            <span className="text-xs text-muted-foreground">this week</span>
          </div>
        </div>

        {/* Last session */}
        <span className="whitespace-nowrap text-xs text-muted-foreground md:justify-self-end">
          last session {relTime(group.lastSession)}
        </span>

        {/* Action */}
        <Button asChild variant="outline" size="sm" className="md:justify-self-end">
          <Link href={href}>Open builder</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
