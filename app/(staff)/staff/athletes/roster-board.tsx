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
import { RichTextComposer, RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  athleteGoals,
  fmtDay,
  relTime,
  type Athlete,
  type MemberBucket,
  type MemberNote,
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
      {/* Board surface — the tinted backdrop makes it read like the Trello board */}
      <div className="rounded-2xl border border-border bg-brand-soft/60 p-3 dark:bg-brand-soft/50">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              placeholder="Search athletes, sport, or coach…"
              className="border-border/60 bg-surface pl-8"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Columns span horizontally — swipe/scroll sideways like Trello */}
        <div className="flex snap-x items-start gap-3 overflow-x-auto pb-1 scrollbar-slim">
          {COLUMNS.map(({ bucket, title }) => {
            const cards = filtered
              .filter((a) => a.bucket === bucket)
              .sort((a, b) => a.programDueInDays - b.programDueInDays);
            return (
              <div
                key={bucket}
                className="flex w-[272px] shrink-0 snap-start flex-col rounded-xl bg-surface shadow-soft"
              >
                <div className="flex items-center gap-2 px-3 pb-1.5 pt-2.5">
                  <span className="truncate font-mono text-[0.65rem] font-bold uppercase tracking-wide text-foreground/80">
                    {title}
                  </span>
                  <span className="tnum ml-auto text-[0.68rem] font-semibold text-muted-foreground">
                    {cards.length}
                  </span>
                </div>

                <div className="flex max-h-[62vh] flex-col gap-1.5 overflow-y-auto px-1.5 pb-1 scrollbar-slim">
                  {cards.map((a) => (
                    <BoardCard key={a.id} athlete={a} onOpen={() => setOpenId(a.id)} />
                  ))}
                  {cards.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                      No members{query ? " match" : ""}.
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="mx-1.5 mb-1.5 mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Demo — onboarding creates cards here"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add a card
                </button>
              </div>
            );
          })}
        </div>
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
      className="group flex flex-col gap-1.5 rounded-lg border border-transparent bg-card p-2.5 text-left shadow-soft transition-colors hover:border-brand/50"
    >
      {/* Label strips (Trello labels: Finance red / injury amber / PR brand) */}
      {(overdueBilling || hasInjury || athlete.prs.some((p) => p.isNew)) && (
        <span className="flex gap-1">
          {overdueBilling ? (
            <span className="h-2 w-9 rounded-sm bg-destructive" title="Finance" />
          ) : null}
          {hasInjury ? (
            <span className="h-2 w-9 rounded-sm bg-warning" title="Injury flag" />
          ) : null}
          {athlete.prs.some((p) => p.isNew) ? (
            <span className="h-2 w-9 rounded-sm bg-brand" title="New PR" />
          ) : null}
        </span>
      )}

      {/* Trello card title: NAME [Sport, Sex, YOB] */}
      <span className="text-[0.8rem] font-semibold uppercase leading-snug tracking-tight">
        {cardTitle(athlete)}
      </span>

      {/* Badge row: due chip + counters, avatar pinned right like Trello */}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.66rem] font-semibold",
            due.tone === "danger"
              ? "bg-destructive text-destructive-foreground"
              : due.tone === "warning"
                ? "bg-warning/20 text-warning"
                : "bg-muted text-muted-foreground",
          )}
        >
          <CalendarClock className="h-3 w-3" />
          {fmtDay(dueDate(athlete).toISOString()).replace(/^\w+, /, "")}
          {athlete.programDueInDays === 0 ? " · Overdue" : ""}
        </span>
        <span className="inline-flex items-center gap-1 text-[0.66rem] text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          {athlete.notes.length}
        </span>
        <span className="inline-flex items-center gap-1 text-[0.66rem] text-muted-foreground">
          <CheckSquare className="h-3 w-3" />
          {athlete.program.day}/{athlete.program.totalDays}
        </span>
      </span>

      {/* Custom fields + member avatar, Trello-style footer */}
      <span className="flex items-end justify-between gap-2">
        <span className="text-[0.68rem] leading-snug text-muted-foreground">
          {trainingField(athlete)}
          {athlete.nutrition === "pro" ? (
            <>
              <br />
              Nutrition: Pro
            </>
          ) : null}
        </span>
        <AthleteAvatar
          initials={athlete.initials}
          hue={athlete.hue}
          size="sm"
          className="h-6 w-6 shrink-0 text-[0.55rem]"
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card modal — Trello card layout: description left, notes feed right */
/* ------------------------------------------------------------------ */

function CardModal({
  athlete,
  onClose,
}: {
  athlete: Athlete;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<MemberNote[]>(athlete.notes);
  const [draftHtml, setDraftHtml] = useState("");
  const [resetKey, setResetKey] = useState(0);

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
    if (!draftHtml.trim()) return;
    setNotes((prev) => [
      {
        id: `local-${prev.length}`,
        date: new Date().toISOString(),
        coach: "Coach Ellis",
        body: draftHtml,
      },
      ...prev,
    ]);
    setDraftHtml("");
    setResetKey((k) => k + 1);
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
                <Button asChild variant="outline" size="sm" className="h-8">
                  <Link
                    href={`/staff/athletes/${athlete.id}/assessment` as Route}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Assessment
                  </Link>
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

          {/* Right: notes as the comments/activity feed */}
          <div className="flex flex-col gap-3 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-bold">Notes</h4>
              <span className="tnum ml-auto text-xs text-muted-foreground">
                {notes.length} on file
              </span>
            </div>

            {/* Composer — grows with the note, Trello-style */}
            <RichTextComposer
              placeholder="Write a comment…"
              onChangeHtml={setDraftHtml}
              resetKey={resetKey}
              actions={
                <Button
                  variant="brand"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={saveNote}
                  disabled={!draftHtml.trim()}
                >
                  Save note
                </Button>
              }
            />

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
                  <RichTextView
                    html={n.body}
                    className="text-xs text-foreground/90"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
