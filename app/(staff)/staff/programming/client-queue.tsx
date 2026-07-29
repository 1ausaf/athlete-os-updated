"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search, Users } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Progress } from "@/components/app/progress";
import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
 * Demo program runway per team — how many days until the shared program's
 * last published day is trained. (Wish: a real runway field on TrainingGroup.)
 */
const TEAM_RUNWAY: Record<string, number> = {
  "grp-golf": 9,
  "grp-track": 2,
  "grp-tigers": 5,
};

type QueueEntry =
  | { kind: "athlete"; runway: number; athlete: Athlete }
  | { kind: "team"; runway: number; group: TrainingGroup };

type TypeFilter = "all" | "athletes" | "teams";

/**
 * Client queue (C14/C15): every client — individual athletes AND teams — in
 * ONE list sorted by program runway, with search, a type filter and a
 * responsible-coach filter.
 */
export function ClientQueue({ viewerId }: { viewerId: string }) {
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const { entries, athleteCount, teamCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const coachId = coachFilter === "mine" ? viewerId : coachFilter;
    const coachName = coachFilter === "all" ? null : staffById(coachId)?.name;

    // Paused/inactive members have no program runway — active only (R4).
    const athleteEntries: QueueEntry[] = athletes
      .filter((a) => a.status === "active")
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .filter(
        (a) => coachFilter === "all" || programmingCoachIdFor(a.id) === coachId,
      )
      .map((a) => ({ kind: "athlete", runway: a.programDueInDays, athlete: a }));

    // Teams are clients too (C15) — one shared program each.
    const teamEntries: QueueEntry[] = trainingGroups
      .filter((g) => !q || g.name.toLowerCase().includes(q))
      .filter(
        (g) => coachFilter === "all" || (coachName != null && g.coachNames.includes(coachName)),
      )
      .map((g) => ({ kind: "team", runway: TEAM_RUNWAY[g.id] ?? 7, group: g }));

    const merged = [...athleteEntries, ...teamEntries].sort(
      (a, b) => a.runway - b.runway,
    );
    return {
      entries:
        typeFilter === "all"
          ? merged
          : merged.filter((e) =>
              typeFilter === "athletes" ? e.kind === "athlete" : e.kind === "team",
            ),
      athleteCount: athleteEntries.length,
      teamCount: teamEntries.length,
    };
  }, [coachFilter, query, typeFilter, viewerId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Sorted by program runway — a client hits zero when their last
          published day is trained. Write the next block before they run out.
        </p>
        <span className="flex flex-wrap items-center gap-2">
          {/* C14 — type-to-filter search over clients and teams */}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              className="h-9 w-full pl-9 sm:w-52"
              aria-label="Search the client queue"
            />
          </span>
          <Select value={coachFilter} onValueChange={setCoachFilter}>
            <SelectTrigger
              className="h-9 w-full sm:w-44"
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
        </span>
      </div>

      {/* C15 — one list; filter by client type */}
      <TabBar<TypeFilter>
        tabs={[
          { value: "all", label: "All", count: athleteCount + teamCount },
          { value: "athletes", label: "Athletes", count: athleteCount },
          { value: "teams", label: "Teams", count: teamCount },
        ]}
        active={typeFilter}
        onSelect={setTypeFilter}
      />

      {entries.map((entry) =>
        entry.kind === "athlete" ? (
          <QueueRow key={entry.athlete.id} athlete={entry.athlete} />
        ) : (
          <TeamRow
            key={entry.group.id}
            group={entry.group}
            runway={entry.runway}
          />
        ),
      )}
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted-foreground">
          No clients match — clear the search or filters.
        </p>
      ) : null}
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

/** A team styled as a client row — "Tigers HPP [A] · Team · 12 members" (C15). */
function TeamRow({ group, runway }: { group: TrainingGroup; runway: number }) {
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
              {group.athleteCount} members · {group.focus}
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
            <span className="text-xs text-muted-foreground">
              last session {relTime(group.lastSession)}
            </span>
          </div>
        </div>

        {/* Runway */}
        <div className="md:justify-self-end">{runwayPill(runway)}</div>

        {/* Action */}
        <Button asChild variant="outline" size="sm" className="md:justify-self-end">
          <Link href={href}>Open builder</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
