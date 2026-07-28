"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { ArrowRight, Clipboard, MapPin, X } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Progress } from "@/components/app/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  athleteById,
  fmtTime,
  type TrainingSession,
} from "@/lib/demo/data";
import { cn } from "@/lib/utils";

import { ComingVsCoach } from "./coming-vs-coach";

export interface SessionDayGroup {
  day: string;
  label: string;
  items: TrainingSession[];
}

/**
 * Day-grouped session cards with brief multi-select: coaches huddle once for
 * several back-to-back blocks, so tick 2–3 sessions and open one combined
 * brief (client feedback, round 3).
 */
export function SessionsList({ groups }: { groups: SessionDayGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const briefHref =
    `/staff/sessions/huddle-brief?sessions=${[...selected].join(",")}` as Route;

  return (
    <>
      {groups.map((group) => (
        <section key={group.day} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg">{group.label}</h2>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {group.items.length} session{group.items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.items.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                selected={selected.has(s.id)}
                onToggle={() => toggle(s.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Sticky combined-brief bar */}
      {selected.size > 0 ? (
        <div className="sticky bottom-4 z-30 flex items-center gap-3 self-center rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-raised backdrop-blur">
          <span className="text-sm font-medium">
            {selected.size} session{selected.size === 1 ? "" : "s"} selected
          </span>
          <Button asChild variant="brand" size="sm">
            <Link href={briefHref}>
              <Clipboard className="h-4 w-4" />
              Open combined brief
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear selection"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </>
  );
}

function rosterStats(session: TrainingSession) {
  const confirmed = session.roster.filter((r) => r.state === "confirmed").length;
  const pending = session.roster.filter((r) => r.state === "pending").length;
  const fillPct = Math.round((session.roster.length / session.capacity) * 100);
  return { confirmed, pending, fillPct };
}

function SessionCard({
  session,
  selected,
  onToggle,
}: {
  session: TrainingSession;
  selected: boolean;
  onToggle: () => void;
}) {
  const { confirmed, pending, fillPct } = rosterStats(session);
  const roster = session.roster
    .map((r) => athleteById(r.athleteId))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <Card
      className={cn(
        "transition-colors hover:border-brand/40",
        selected && "border-brand/60 bg-brand/[0.03]",
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggle}
              aria-label={`Add ${session.title} to the huddle brief`}
              className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--brand))]"
            />
            <span className="min-w-0">
              <span className="block text-base font-bold">{session.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {fmtTime(session.startsAt)}–{fmtTime(session.endsAt)} ·{" "}
                {session.coach}
              </span>
            </span>
          </label>
          {session.waitlist.length > 0 ? (
            <Pill tone="info">{session.waitlist.length} waitlist</Pill>
          ) : null}
        </div>

        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {session.location}
        </p>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capacity</span>
            <span className="tnum font-semibold">
              {session.roster.length}
              <span className="text-muted-foreground">/{session.capacity}</span>
            </span>
          </div>
          <Progress value={fillPct} tone={fillPct >= 100 ? "warning" : "brand"} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="success">{confirmed} confirmed</Pill>
            {pending > 0 ? <Pill tone="warning">{pending} pending</Pill> : null}
            {session.capacity - session.roster.length > 0 ? (
              <Pill tone="neutral">
                {session.capacity - session.roster.length} open
              </Pill>
            ) : (
              <Pill tone="warning">Full</Pill>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <ComingVsCoach roster={roster} coachName={session.coach} />
          <Button asChild variant="ghost" size="sm">
            <Link href={`/staff/sessions/${session.id}` as Route}>
              Roster
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
