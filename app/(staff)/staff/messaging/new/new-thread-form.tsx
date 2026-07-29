"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { RuleOfTwoBanner } from "@/components/app/rule-of-two";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { athletes, type ThreadParticipant } from "@/lib/demo/data";

/** The signed-in coach ("me"). */
const ME: ThreadParticipant = {
  id: "coach-ellis",
  name: "Coach Ellis",
  role: "coach",
};

/** A second coach that can be added to satisfy Rule of Two. */
const SECOND_COACH: ThreadParticipant = {
  id: "coach-nadia",
  name: "Coach Nadia",
  role: "coach",
};

function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function NewThreadForm() {
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [added, setAdded] = useState<ThreadParticipant[]>([]);
  const [sent, setSent] = useState(false);

  const athlete = athletes.find((a) => a.id === athleteId) ?? null;

  // Full live participant list: me (coach) + athlete + any added adults.
  const participants: ThreadParticipant[] = useMemo(() => {
    const list: ThreadParticipant[] = [ME];
    if (athlete) {
      list.push({
        id: athlete.id,
        name: athlete.name,
        role: "athlete",
        isMinor: athlete.isMinor,
      });
    }
    list.push(...added);
    return list;
  }, [athlete, added]);

  // Rule-of-Two compliance mirrors RuleOfTwoBanner's own logic.
  const hasMinor = participants.some((p) => p.isMinor);
  const guardianPresent = participants.some((p) => p.role === "guardian");
  const secondCoach = participants.filter((p) => p.role === "coach").length >= 2;
  const compliant = !hasMinor || guardianPresent || secondCoach;

  const canSubmit = Boolean(athlete) && compliant;

  // Candidate second adults for the selected minor athlete.
  const guardianCandidates: ThreadParticipant[] = athlete
    ? athlete.guardians.map((g) => ({
        id: `guardian-${g.email}`,
        name: g.name,
        role: "guardian",
      }))
    : [];

  function selectAthlete(id: string) {
    const next = athletes.find((a) => a.id === id) ?? null;
    setAthleteId(id);
    setAdded([]); // reset second adults when the athlete changes
    setSent(false);
    if (next && !subject.trim()) {
      setSubject(`${next.name.split(" ")[0]} — check-in`);
    }
  }

  function toggleAdult(p: ThreadParticipant) {
    setAdded((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, p],
    );
  }

  const isAdded = (id: string) => added.some((x) => x.id === id);

  if (sent && athlete) {
    return (
      <Card className="overflow-hidden bg-brand-sheen">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-2xl">Thread created</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
              &ldquo;{subject.trim() || `${athlete.name} — check-in`}&rdquo; is
              open with {participants.length} participants.
              {hasMinor
                ? " Rule of Two is satisfied — this thread can never become a private 1:1 with a minor."
                : " Direct 1:1 messaging with an adult athlete is permitted."}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {participants.map((p) => (
              <Pill key={p.id} tone={p.role === "coach" ? "brand" : "neutral"}>
                {p.name}
                <span className="opacity-60">· {p.role}</span>
              </Pill>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild variant="brand">
              <Link href={"/staff/messaging" as Route}>
                Back to inbox
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setAthleteId(null);
                setAdded([]);
                setSubject("");
              }}
            >
              Start another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* Left: builder */}
      <div className="flex flex-col gap-6">
        {/* Step 1 — athlete */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <StepHeader n={1} title="Choose an athlete" />
            <div className="grid gap-2 sm:grid-cols-2">
              {athletes.map((a) => {
                const active = a.id === athleteId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAthlete(a.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-brand bg-brand/[0.07] ring-1 ring-brand/40"
                        : "border-border bg-surface/50 hover:bg-accent/50",
                    )}
                  >
                    <AthleteAvatar
                      initials={a.initials}
                      hue={a.hue}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {a.name}
                        </span>
                        {a.isMinor ? <Pill tone="info">Minor</Pill> : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {a.sport} · age {a.age}
                      </span>
                    </div>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-brand-ink" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2 — subject */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <StepHeader n={2} title="Subject" />
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Return-to-play check-ins"
              disabled={!athlete}
            />
          </CardContent>
        </Card>

        {/* Step 3 — second adult (only when a minor is selected) */}
        {athlete?.isMinor ? (
          <Card
            className={cn(
              compliant ? "border-success/40" : "border-destructive/40",
            )}
          >
            <CardContent className="flex flex-col gap-4 p-5">
              <StepHeader
                n={3}
                title="Add a second adult"
                required={!compliant}
              />
              <p className="text-sm text-muted-foreground">
                {athlete.name.split(" ")[0]} is a minor. Safe-Sport requires a
                parent/guardian or a second coach on the thread before it can
                open.
              </p>

              {guardianCandidates.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">Guardians</span>
                  {guardianCandidates.map((g, i) => (
                    <AdultRow
                      key={g.id}
                      participant={g}
                      subtitle={athlete.guardians[i]?.relation ?? "Guardian"}
                      selected={isAdded(g.id)}
                      onToggle={() => toggleAdult(g)}
                    />
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <span className="eyebrow">Second coach</span>
                <AdultRow
                  participant={SECOND_COACH}
                  subtitle="Assigned coach"
                  selected={isAdded(SECOND_COACH.id)}
                  onToggle={() => toggleAdult(SECOND_COACH)}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Right: live compliance + participants + submit */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base">Live compliance</h3>
            </div>

            {athlete ? (
              <RuleOfTwoBanner participants={participants} />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface/30 px-3 py-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                Select an athlete to preview Rule-of-Two status.
              </div>
            )}

            {/* Participant roster */}
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Participants ({participants.length})</span>
              <div className="flex flex-col gap-1.5">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-surface/50 p-2"
                  >
                    <AthleteAvatar
                      initials={initialsFor(p.name)}
                      hue={hueFor(p.id)}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.name}
                      </div>
                      <div className="text-xs capitalize text-muted-foreground">
                        {p.role}
                        {p.id === ME.id ? " · you" : ""}
                        {p.isMinor ? " · minor" : ""}
                      </div>
                    </div>
                    {added.some((x) => x.id === p.id) ? (
                      <button
                        type="button"
                        onClick={() =>
                          setAdded((prev) => prev.filter((x) => x.id !== p.id))
                        }
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit + inline explanation */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="brand"
                className="w-full"
                disabled={!canSubmit}
                onClick={() => setSent(true)}
              >
                {canSubmit ? null : <Lock className="h-4 w-4" />}
                Create thread
              </Button>

              {!athlete ? (
                <p className="text-center text-xs text-muted-foreground">
                  Choose an athlete to continue.
                </p>
              ) : !compliant ? (
                <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/[0.06] px-2.5 py-2 text-xs text-destructive">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    A second adult is required before this thread with a minor
                    can open. No admin override is permitted.
                  </span>
                </p>
              ) : hasMinor ? (
                <p className="flex items-start gap-1.5 text-xs text-success">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Rule of Two satisfied — ready to create.
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Adult athlete — direct 1:1 messaging permitted.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepHeader({
  n,
  title,
  required,
}: {
  n: number;
  title: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand-ink">
        {n}
      </span>
      <h3 className="text-base">{title}</h3>
      {required ? (
        <Pill tone="danger" className="ml-auto">
          Required
        </Pill>
      ) : null}
    </div>
  );
}

function AdultRow({
  participant,
  subtitle,
  selected,
  onToggle,
}: {
  participant: ThreadParticipant;
  subtitle: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-success/50 bg-success/[0.06]"
          : "border-border bg-surface/50 hover:bg-accent/50",
      )}
    >
      <AthleteAvatar
        initials={initialsFor(participant.name)}
        hue={hueFor(participant.id)}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{participant.name}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold",
          selected ? "text-success" : "text-brand-ink",
        )}
      >
        {selected ? (
          <>
            <Check className="h-4 w-4" />
            Added
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Add
          </>
        )}
      </span>
    </button>
  );
}
