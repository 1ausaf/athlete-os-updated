"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  CalendarClock,
  CheckSquare,
  ExternalLink,
  FolderOpen,
  Link2,
  MessageSquare,
  MessagesSquare,
  NotebookPen,
  Phone,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  athleteGoals,
  fmtDay,
  relTime,
  type Athlete,
  type CapNote,
  type MemberBucket,
} from "@/lib/demo/data";
import { cn } from "@/lib/utils";

import { programDueMeta } from "./program-due";

/* ------------------------------------------------------------------ */
/* Board config — mirrors the client's Trello list names               */
/* ------------------------------------------------------------------ */

const COLUMNS: { bucket: MemberBucket; title: string }[] = [
  { bucket: "in-gym", title: "OP: MEMBERS (IN-GYM)" },
  { bucket: "private", title: "OP: MEMBERS (PRIVATE)" },
  { bucket: "program-only", title: "OP: MEMBERS (PROGRAM ONLY)" },
  { bucket: "online", title: "OP: MEMBERS (ONLINE)" },
  { bucket: "away", title: "OP: AT-RISK / AWAY" },
];

/** Trello-card title format: "JORDAN VEGA [Hockey, M, 2007]". */
function cardTitle(a: Athlete): string {
  return `${a.name} [${a.sport}, ${a.gender}, ${a.yearOfBirth}]`;
}

/** "Training: Gym: 3" / "Training: Away: 4" custom-field line. */
function trainingField(a: Athlete): string {
  const where =
    a.bucket === "in-gym" || a.bucket === "private" ? "Gym" : "Away";
  return `Training: ${where}: ${a.frequencyPerWeek}`;
}

/** Due date derived from days-of-program-left, rendered like a Trello chip. */
function dueDate(a: Athlete): Date {
  const d = new Date();
  d.setDate(d.getDate() + a.programDueInDays);
  return d;
}

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

export function RosterBoard({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

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

  const open = openId ? athletes.find((a) => a.id === openId) ?? null : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Search athletes, sport, or coach…"
            className="pl-8"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          The member board — same lists as the Trello workflow, cards sorted by
          programming due date. Click a card to open it.
        </span>
      </div>

      {/* Columns span horizontally, like the Trello board */}
      <div className="-mx-1 flex items-start gap-3 overflow-x-auto px-1 pb-2 scrollbar-slim">
        {COLUMNS.map(({ bucket, title }) => {
          const cards = filtered
            .filter((a) => a.bucket === bucket)
            .sort((a, b) => a.programDueInDays - b.programDueInDays);
          return (
            <div
              key={bucket}
              className="flex w-[290px] shrink-0 flex-col rounded-xl border border-border bg-surface-muted/70"
            >
              <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                <span className="font-mono text-[0.66rem] font-bold uppercase tracking-wider text-muted-foreground">
                  {title}
                </span>
                <span className="tnum ml-auto rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                  {cards.length}
                </span>
              </div>

              <div className="flex max-h-[58vh] flex-col gap-2 overflow-y-auto px-2 pb-2 scrollbar-slim">
                {cards.map((a) => (
                  <BoardCard key={a.id} athlete={a} onOpen={() => setOpenId(a.id)} />
                ))}
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                    No members here{query ? " for this search" : ""}.
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                className="mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Demo — onboarding creates cards here"
              >
                <Plus className="h-3.5 w-3.5" />
                Add a card
              </button>
            </div>
          );
        })}
      </div>

      {open ? <CardModal athlete={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function BoardCard({
  athlete,
  onOpen,
}: {
  athlete: Athlete;
  onOpen: () => void;
}) {
  const due = programDueMeta(athlete.programDueInDays);
  const overdueBilling = athlete.billing.state === "overdue";
  const hasInjury = athlete.injuryFlags.length > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-soft transition-colors hover:border-brand/40"
    >
      {/* Label strips (Trello labels: Finance red / injury amber / PR brand) */}
      {(overdueBilling || hasInjury || athlete.prs.some((p) => p.isNew)) && (
        <span className="flex gap-1">
          {overdueBilling ? (
            <span className="h-1.5 w-8 rounded-full bg-destructive" title="Finance" />
          ) : null}
          {hasInjury ? (
            <span className="h-1.5 w-8 rounded-full bg-warning" title="Injury flag" />
          ) : null}
          {athlete.prs.some((p) => p.isNew) ? (
            <span className="h-1.5 w-8 rounded-full bg-brand" title="New PR" />
          ) : null}
        </span>
      )}

      <span className="text-sm font-semibold leading-snug">
        {cardTitle(athlete)}
      </span>

      {/* Chips row: due date · CAP count · program checklist */}
      <span className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.68rem] font-semibold",
            due.tone === "danger"
              ? "bg-destructive text-destructive-foreground"
              : due.tone === "warning"
                ? "bg-warning/15 text-warning"
                : "bg-muted text-muted-foreground",
          )}
        >
          <CalendarClock className="h-3 w-3" />
          {fmtDay(dueDate(athlete).toISOString()).replace(/^\w+, /, "")}
          {athlete.programDueInDays === 0 ? " · Overdue" : ""}
        </span>
        <span className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          {athlete.capNotes.length}
        </span>
        <span className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground">
          <CheckSquare className="h-3 w-3" />
          {athlete.program.day}/{athlete.program.totalDays}
        </span>
      </span>

      {/* Custom fields line */}
      <span className="text-[0.7rem] text-muted-foreground">
        {trainingField(athlete)}
        {athlete.nutrition === "pro" ? "  ·  Nutrition: Pro" : ""}
      </span>

      <span className="flex items-center justify-end">
        <AthleteAvatar
          initials={athlete.initials}
          hue={athlete.hue}
          size="sm"
          className="h-6 w-6 text-[0.55rem]"
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card modal — Trello card layout: description left, CAP feed right   */
/* ------------------------------------------------------------------ */

function CardModal({
  athlete,
  onClose,
}: {
  athlete: Athlete;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<CapNote[]>(athlete.capNotes);
  const [draft, setDraft] = useState({ context: "", action: "", plan: "" });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const due = programDueMeta(athlete.programDueInDays);
  const column = COLUMNS.find((c) => c.bucket === athlete.bucket);
  const profileHref = `/staff/athletes/${athlete.id}` as Route;
  const programHref = `/staff/athletes/${athlete.id}/program` as Route;

  function saveNote() {
    if (!draft.context.trim() && !draft.action.trim() && !draft.plan.trim()) return;
    setNotes((prev) => [
      {
        id: `local-${prev.length}`,
        date: new Date().toISOString(),
        coach: "Coach Ellis",
        context: draft.context.trim() || "—",
        action: draft.action.trim() || "—",
        plan: draft.plan.trim() || "—",
      },
      ...prev,
    ]);
    setDraft({ context: "", action: "", plan: "" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm md:py-10"
      role="dialog"
      aria-modal="true"
      aria-label={`${athlete.name} member card`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border p-5">
          <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted-foreground">
              {column?.title}
            </p>
            <h3 className="text-lg leading-tight">{cardTitle(athlete)}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {athlete.billing.state === "overdue" ? (
                <Pill tone="danger">Finance</Pill>
              ) : null}
              {athlete.injuryFlags.length > 0 ? (
                <Pill tone="warning">Injury</Pill>
              ) : null}
              <Pill tone={due.tone} dot>
                {due.label}
              </Pill>
              <Pill tone="neutral" icon={<CalendarClock className="h-3 w-3" />}>
                Due {fmtDay(dueDate(athlete).toISOString())}
              </Pill>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close card">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1.15fr_1fr]">
          {/* Left: description — the Trello card body */}
          <div className="flex flex-col gap-5">
            <section>
              <h4 className="eyebrow mb-2">Program &amp; plan</h4>
              <div className="flex flex-wrap gap-1.5">
                <Button asChild variant="outline" size="sm" className="h-8">
                  <Link href={programHref}>
                    <FolderOpen className="h-3.5 w-3.5" />
                    Program
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8">
                  <Link href={"/staff/messaging" as Route}>
                    <MessagesSquare className="h-3.5 w-3.5" />
                    Chat
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 opacity-60" title="Stubbed in the demo">
                  <Link2 className="h-3.5 w-3.5" />
                  Assessment
                </Button>
                <Button variant="outline" size="sm" className="h-8 opacity-60" title="Stubbed in the demo">
                  <Link2 className="h-3.5 w-3.5" />
                  Drive
                </Button>
              </div>
            </section>

            <section>
              <h4 className="eyebrow mb-1.5">Goals</h4>
              <p className="text-sm leading-relaxed">
                {athleteGoals[athlete.id] ?? "—"}
              </p>
            </section>

            <section>
              <h4 className="eyebrow mb-1.5">Injury / medical history</h4>
              {athlete.injuryFlags.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {athlete.injuryFlags.map((f) => (
                    <li
                      key={f}
                      className="rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs font-medium text-warning"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">…</p>
              )}
            </section>

            <section>
              <h4 className="eyebrow mb-1.5">Nutrition</h4>
              <p className="text-sm text-muted-foreground">
                {athlete.nutrition === "pro"
                  ? "Pro protocol — active."
                  : "Not on a nutrition plan."}
              </p>
            </section>

            <section>
              <h4 className="eyebrow mb-1.5">Contact info</h4>
              {athlete.guardians.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {athlete.guardians.map((g) => (
                    <li key={g.email} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{g.name}</span>{" "}
                      · {g.relation} ·{" "}
                      <span className="font-mono text-xs">{g.email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone="neutral" icon={<Phone className="h-3 w-3" />}>
                    OpenPhone
                  </Pill>
                  <Pill tone="neutral" icon={<ExternalLink className="h-3 w-3" />}>
                    Square
                  </Pill>
                  <Pill tone="neutral" icon={<ExternalLink className="h-3 w-3" />}>
                    Google Contact
                  </Pill>
                </div>
              )}
            </section>

            <Button asChild variant="brand" size="sm" className="self-start">
              <Link href={profileHref}>Open full profile</Link>
            </Button>
          </div>

          {/* Right: CAP notes as the comments/activity feed */}
          <div className="flex flex-col gap-3 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-bold">CAP notes</h4>
              <span className="tnum ml-auto text-xs text-muted-foreground">
                {notes.length} on file
              </span>
            </div>

            {/* Composer */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface/50 p-2.5">
              {(["context", "action", "plan"] as const).map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-[0.6rem] font-bold text-muted-foreground">
                    {k[0].toUpperCase()}
                  </span>
                  <Textarea
                    value={draft[k]}
                    rows={1}
                    placeholder={
                      k === "context"
                        ? "What did you see?"
                        : k === "action"
                          ? "What did you do?"
                          : "What's next?"
                    }
                    className="min-h-0 resize-none border-0 bg-transparent p-1 text-xs shadow-none focus-visible:ring-0"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [k]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <Button
                variant="brand"
                size="sm"
                className="h-7 self-end text-xs"
                onClick={saveNote}
                disabled={!draft.context.trim() && !draft.action.trim() && !draft.plan.trim()}
              >
                Save note
              </Button>
            </div>

            {/* Feed */}
            <div className="flex max-h-[46vh] flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-slim">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface/40 p-3"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold">{n.coach}</span>
                    <span className="text-muted-foreground">{relTime(n.date)}</span>
                  </div>
                  <dl className="flex flex-col gap-1 text-xs leading-relaxed">
                    {(
                      [
                        ["C", n.context],
                        ["A", n.action],
                        ["P", n.plan],
                      ] as const
                    ).map(([label, text]) => (
                      <div key={label} className="flex gap-2">
                        <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted font-mono text-[0.55rem] font-bold text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-foreground/90">{text}</span>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
