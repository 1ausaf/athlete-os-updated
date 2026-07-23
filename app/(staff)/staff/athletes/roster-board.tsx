"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  ArrowDownAZ,
  CalendarClock,
  CheckSquare,
  ExternalLink,
  FolderOpen,
  Link2,
  Mail,
  MailWarning,
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
import { Progress } from "@/components/app/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  athleteGoals,
  athleteProfileById,
  fmtDay,
  relTime,
  type Athlete,
  type MemberBucket,
  type MemberNote,
} from "@/lib/demo/data";
import {
  athleteChecklists,
  checklistTemplateById,
  checklistTemplates,
  type AthleteChecklist,
} from "@/lib/demo/checklists";
import {
  COACH_ROLE_LABEL,
  assignmentsForAthlete,
  athleteIdsForStaff,
  staffMembers,
  type CoachRole,
} from "@/lib/demo/staff";
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

/** Days since the last note — the client's 14-day inactivity rule (C3). */
function daysSinceLastNote(a: Athlete): number {
  const last = a.notes[0]?.date;
  if (!last) return 999;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
}

const STALE_DAYS = 14;

type SortMode = "due" | "alpha";

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

export function RosterBoard({
  athletes,
  viewerStaffId,
}: {
  athletes: Athlete[];
  /** The signed-in staff member — powers the "Only my athletes" filter. */
  viewerStaffId: string;
}) {
  const [list, setList] = useState<Athlete[]>(athletes);
  const [query, setQuery] = useState("");
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("due");
  const [digestOpen, setDigestOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<MemberBucket | null>(null);

  const sports = useMemo(
    () => Array.from(new Set(list.map((a) => a.sport))).sort(),
    [list],
  );
  const coaches = staffMembers.filter((s) => s.role === "coach");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = list;
    if (q) {
      out = out.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sport.toLowerCase().includes(q) ||
          a.coach.toLowerCase().includes(q),
      );
    }
    if (coachFilter !== "all") {
      const staffId = coachFilter === "mine" ? viewerStaffId : coachFilter;
      const ids = athleteIdsForStaff(staffId);
      out = out.filter((a) => ids.has(a.id));
    }
    if (sportFilter !== "all") {
      out = out.filter((a) => a.sport === sportFilter);
    }
    return out;
  }, [list, query, coachFilter, sportFilter, viewerStaffId]);

  const stale = useMemo(
    () => list.filter((a) => daysSinceLastNote(a) >= STALE_DAYS),
    [list],
  );

  const open = openId ? list.find((a) => a.id === openId) ?? null : null;

  function updateAthlete(id: string, patch: Partial<Athlete>) {
    setList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }

  function addAthlete(bucket: MemberBucket, name: string, sport: string, yob: number) {
    const id = `ath-new-${Date.now()}`;
    const initials = name
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const card: Athlete = {
      id,
      slug: id,
      name,
      initials: initials || "??",
      hue: (name.length * 47) % 360,
      sport: sport || "General",
      age: Math.max(0, new Date().getFullYear() - yob),
      isMinor: new Date().getFullYear() - yob < 18,
      yearOfBirth: yob,
      gender: "M",
      bucket,
      programDueInDays: 14,
      nutrition: "none",
      coach: "Unassigned",
      planName: "Onboarding",
      frequency: "—",
      frequencyPerWeek: 0,
      bookedThisWeek: 0,
      billing: { state: "pending", amountDueCents: 0, nextInvoice: new Date().toISOString() },
      program: { name: "Onboarding", day: 0, totalDays: 0, phase: "Assessment", block: "—", compliancePct: 0 },
      attendancePct: 0,
      injuryFlags: [],
      season: "off-season",
      reminders: ["New member — run the onboarding checklist"],
      guardians: [],
      lastActive: new Date().toISOString(),
      notes: [],
      prs: [],
    };
    setList((prev) => [card, ...prev]);
    setOpenId(id);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Control bar — search + filters + sort, Trello-style (C2/C8) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Search athletes, sport, or coach…"
            className="border-border/60 bg-surface pl-8"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={coachFilter}
          onChange={(e) => setCoachFilter(e.target.value)}
          aria-label="Filter by coach"
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <option value="all">All coaches</option>
          <option value="mine">Only my athletes</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          aria-label="Filter by sport"
          className="h-9 rounded-md border border-input bg-surface px-2.5 text-sm"
        >
          <option value="all">All sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortMode((m) => (m === "due" ? "alpha" : "due"))}
          className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-surface px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          title="Toggle sort"
        >
          <ArrowDownAZ className="h-4 w-4" />
          Sort: {sortMode === "due" ? "Due date" : "Alphabetical"}
        </button>

        {stale.length > 0 ? (
          <button
            type="button"
            onClick={() => setDigestOpen(true)}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 text-sm font-medium text-warning transition-colors hover:bg-warning/15"
          >
            <MailWarning className="h-4 w-4" />
            {stale.length} card{stale.length === 1 ? "" : "s"} need attention
          </button>
        ) : null}
      </div>

      {/* Board surface — neutral, full width (client: lose the pink) */}
      <div className="rounded-2xl border border-border bg-surface-muted/40 p-3">
        {/* Columns span the full width; scroll sideways only when cramped */}
        <div className="flex items-start gap-3 overflow-x-auto pb-1 scrollbar-slim">
          {COLUMNS.map(({ bucket, title }) => {
            const cards = filtered
              .filter((a) => a.bucket === bucket)
              .sort((a, b) =>
                sortMode === "due"
                  ? a.programDueInDays - b.programDueInDays
                  : a.name.localeCompare(b.name),
              );
            return (
              <div
                key={bucket}
                className="flex min-w-[252px] flex-1 shrink-0 flex-col rounded-xl bg-surface shadow-soft"
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

                {addingIn === bucket ? (
                  <AddCardForm
                    onCancel={() => setAddingIn(null)}
                    onAdd={(name, sport, yob) => {
                      addAthlete(bucket, name, sport, yob);
                      setAddingIn(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingIn(bucket)}
                    className="mx-1.5 mb-1.5 mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a card
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {open ? (
        <CardModal
          athlete={open}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => updateAthlete(open.id, patch)}
        />
      ) : null}

      {digestOpen ? (
        <DigestModal stale={stale} onClose={() => setDigestOpen(false)} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add-a-card (O2 — owner asked for a real add-clients flow)           */
/* ------------------------------------------------------------------ */

function AddCardForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, sport: string, yob: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [yob, setYob] = useState("");
  const canAdd = name.trim().length > 1;

  return (
    <div className="mx-1.5 mb-1.5 mt-0.5 flex flex-col gap-1.5 rounded-lg border border-brand/30 bg-card p-2">
      <Input
        autoFocus
        value={name}
        placeholder="Full name"
        className="h-8 text-sm"
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-1.5">
        <Input
          value={sport}
          placeholder="Sport"
          className="h-8 text-sm"
          onChange={(e) => setSport(e.target.value)}
        />
        <Input
          value={yob}
          placeholder="YOB"
          inputMode="numeric"
          className="h-8 w-20 text-sm"
          onChange={(e) => setYob(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="brand"
          size="sm"
          className="h-7 text-xs"
          disabled={!canAdd}
          onClick={() =>
            onAdd(
              name.trim(),
              sport.trim(),
              Number(yob) || new Date().getFullYear() - 16,
            )
          }
        >
          Add member
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
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
  const checklist = athleteChecklists[athlete.id]?.[0];
  const checklistDone = checklist?.checked.filter(Boolean).length ?? 0;
  const checklistTotal = checklist?.checked.length ?? 0;
  const stale = daysSinceLastNote(athlete) >= STALE_DAYS;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-1.5 rounded-lg border border-transparent bg-card p-2.5 text-left shadow-soft transition-colors hover:border-brand/50"
    >
      {/* Label strips (Trello labels: Finance red / injury amber / PR brand) */}
      {(overdueBilling || hasInjury || athlete.prs.some((p) => p.isNew) || stale) && (
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
          {stale ? (
            <span
              className="h-2 w-9 rounded-sm bg-muted-foreground/50"
              title={`No note in ${daysSinceLastNote(athlete)} days`}
            />
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
                ? "bg-warning/15 text-warning"
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
          {checklistTotal > 0
            ? `${checklistDone}/${checklistTotal}`
            : `${athlete.program.day}/${athlete.program.totalDays}`}
        </span>
      </span>

      <span className="flex items-center justify-between">
        <span className="text-[0.68rem] text-muted-foreground">
          {trainingField(athlete)}
          {athlete.nutrition === "pro" ? " · Nutrition: Pro" : ""}
        </span>
        <AthleteAvatar initials={athlete.initials} hue={athlete.hue} size="sm" />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Inactivity digest (C3) — replica of the client's automation email    */
/* ------------------------------------------------------------------ */

function DigestModal({
  stale,
  onClose,
}: {
  stale: Athlete[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const byList = COLUMNS.map(({ bucket, title }) => ({
    title,
    items: stale.filter((a) => a.bucket === bucket),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm md:py-12"
      role="dialog"
      aria-modal="true"
      aria-label="Member inactivity report"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Email chrome — mirrors the Trello Automator email they get today */}
        <div className="border-b border-border bg-surface/60 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand-ink">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  AOS Reports{" "}
                  <span className="font-normal text-muted-foreground">
                    &lt;reports@lpsathletic.com&gt;
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  to coaches · daily at 6:00 AM
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close report">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <h3 className="text-lg font-bold text-destructive">
            Member Inactivity Report
          </h3>
          <p className="text-sm text-muted-foreground">
            The following members have not received a note in the last{" "}
            {STALE_DAYS} days.
          </p>
          {byList.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                List: {g.title}
              </p>
              <ul className="flex flex-col gap-1">
                {g.items.map((a) => {
                  const coaches = assignmentsForAthlete(a.id)
                    .map(
                      (as) =>
                        staffMembers.find((s) => s.id === as.staffId)?.name,
                    )
                    .filter(Boolean);
                  return (
                    <li key={a.id} className="text-sm">
                      <span className="font-semibold">{cardTitle(a)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {coaches.length > 0 ? coaches.join(", ") : "Unassigned"}{" "}
                        · {daysSinceLastNote(a)}d quiet
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            In production this digest emails every coach automatically — here
            it&apos;s simulated from the live board data.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card modal — Trello card layout: description left, notes feed right */
/* ------------------------------------------------------------------ */

function CardModal({
  athlete,
  onClose,
  onUpdate,
}: {
  athlete: Athlete;
  onClose: () => void;
  onUpdate: (patch: Partial<Athlete>) => void;
}) {
  const [notes, setNotes] = useState<MemberNote[]>(athlete.notes);
  const [draftHtml, setDraftHtml] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [goals, setGoals] = useState(athleteGoals[athlete.id] ?? "");
  const [editingGoals, setEditingGoals] = useState(false);
  const [checklists, setChecklists] = useState<AthleteChecklist[]>(
    athleteChecklists[athlete.id] ?? [],
  );
  const [assignments, setAssignments] = useState<Record<CoachRole, string>>(
    () => {
      const base = assignmentsForAthlete(athlete.id);
      return {
        programming:
          base.find((a) => a.role === "programming")?.staffId ?? "",
        management: base.find((a) => a.role === "management")?.staffId ?? "",
        assistant: base.find((a) => a.role === "assistant")?.staffId ?? "",
      };
    },
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const due = programDueMeta(athlete.programDueInDays);
  const column = COLUMNS.find((c) => c.bucket === athlete.bucket);
  const profile = athleteProfileById(athlete.id);
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

  function toggleChecklistItem(ci: number, ii: number) {
    setChecklists((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, checked: c.checked.map((v, j) => (j === ii ? !v : v)) }
          : c,
      ),
    );
  }

  function addChecklist(templateId: string) {
    const tpl = checklistTemplateById(templateId);
    if (!tpl) return;
    setChecklists((prev) => [
      ...prev,
      { templateId, checked: tpl.items.map(() => false) },
    ]);
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
        className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-raised"
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
              </div>
            </section>

            {/* Trello-style custom fields — click in and change (C24) */}
            <section>
              <h4 className="eyebrow mb-2">Details</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FieldSelect
                  label="List"
                  value={athlete.bucket}
                  options={COLUMNS.map((c) => ({
                    value: c.bucket,
                    label: c.title.replace("OP: ", ""),
                  }))}
                  onChange={(v) => onUpdate({ bucket: v as MemberBucket })}
                />
                <FieldInput
                  label="Sport"
                  value={athlete.sport}
                  onCommit={(v) => onUpdate({ sport: v || athlete.sport })}
                />
                <FieldInput
                  label="YOB"
                  value={String(athlete.yearOfBirth)}
                  numeric
                  onCommit={(v) => {
                    const n = Number(v);
                    if (Number.isFinite(n) && n > 1900) {
                      onUpdate({ yearOfBirth: n });
                    }
                  }}
                />
                <FieldSelect
                  label="Gender"
                  value={athlete.gender}
                  options={[
                    { value: "M", label: "M" },
                    { value: "F", label: "F" },
                  ]}
                  onChange={(v) => onUpdate({ gender: v as "M" | "F" })}
                />
                <FieldInput
                  label="Due (days)"
                  value={String(athlete.programDueInDays)}
                  numeric
                  onCommit={(v) => {
                    const n = Number(v);
                    if (Number.isFinite(n) && n >= 0) {
                      onUpdate({ programDueInDays: n });
                    }
                  }}
                />
                <FieldSelect
                  label="Nutrition"
                  value={athlete.nutrition}
                  options={[
                    { value: "pro", label: "Pro" },
                    { value: "none", label: "None" },
                  ]}
                  onChange={(v) => onUpdate({ nutrition: v as "pro" | "none" })}
                />
              </div>
            </section>

            {/* Coach assignments (C7) */}
            <section>
              <h4 className="eyebrow mb-2">Coaches</h4>
              <div className="flex flex-col gap-1.5">
                {(Object.keys(COACH_ROLE_LABEL) as CoachRole[]).map((role) => (
                  <div
                    key={role}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-2"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {COACH_ROLE_LABEL[role]}
                    </span>
                    <select
                      value={assignments[role]}
                      aria-label={COACH_ROLE_LABEL[role]}
                      onChange={(e) =>
                        setAssignments((prev) => ({
                          ...prev,
                          [role]: e.target.value,
                        }))
                      }
                      className="h-8 rounded-md border border-input bg-surface px-2 text-sm"
                    >
                      <option value="">—</option>
                      {staffMembers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <p className="text-[0.7rem] text-muted-foreground">
                  Assignments drive who&apos;s in this athlete&apos;s chat
                  thread.
                </p>
              </div>
            </section>

            <section>
              <h4 className="eyebrow mb-1.5">Goals</h4>
              {editingGoals ? (
                <Textarea
                  autoFocus
                  rows={2}
                  value={goals}
                  className="text-sm"
                  onChange={(e) => setGoals(e.target.value)}
                  onBlur={() => setEditingGoals(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingGoals(true)}
                  title="Click to edit"
                  className="w-full rounded-md p-1 -m-1 text-left text-sm leading-relaxed transition-colors hover:bg-accent/50"
                >
                  {goals || "Click to add goals…"}
                </button>
              )}
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

            {/* Contact info prepopulated from the athlete's own profile (C6) */}
            <section>
              <h4 className="eyebrow mb-1.5">Contact info</h4>
              {profile ? (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {athlete.name}
                    </span>{" "}
                    · <span className="font-mono text-xs">{profile.phone}</span> ·{" "}
                    <span className="font-mono text-xs">{profile.email}</span>
                  </p>
                  {profile.instagram ? (
                    <p className="text-xs text-muted-foreground">
                      Instagram {profile.instagram}
                      {profile.hudl ? ` · HUDL ${profile.hudl}` : ""}
                    </p>
                  ) : null}
                  {profile.guardian ? (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {profile.guardian.name}
                      </span>{" "}
                      · {profile.guardian.relation} ·{" "}
                      <span className="font-mono text-xs">
                        {profile.guardian.phone}
                      </span>{" "}
                      ·{" "}
                      <span className="font-mono text-xs">
                        {profile.guardian.email}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-[0.7rem] text-muted-foreground">
                    Synced from the athlete&apos;s profile — they keep it
                    current, you never re-type it.
                  </p>
                </div>
              ) : athlete.guardians.length > 0 ? (
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
                <p className="text-sm text-muted-foreground">
                  No profile on file yet.
                </p>
              )}
              {/* External-system quick links (C25 — their real stack) */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone="neutral" icon={<Phone className="h-3 w-3" />}>
                  Quo
                </Pill>
                <Pill tone="neutral" icon={<ExternalLink className="h-3 w-3" />}>
                  Google Contact
                </Pill>
                <Pill tone="neutral" icon={<ExternalLink className="h-3 w-3" />}>
                  Brevo
                </Pill>
                <Pill tone="neutral" icon={<ExternalLink className="h-3 w-3" />}>
                  Square
                </Pill>
                <Pill tone="neutral" icon={<FolderOpen className="h-3 w-3" />}>
                  Drive
                </Pill>
              </div>
            </section>

            {/* Checklists (C26) */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="eyebrow">Checklists</h4>
                <select
                  value=""
                  aria-label="Add checklist"
                  onChange={(e) => {
                    if (e.target.value) addChecklist(e.target.value);
                  }}
                  className="ml-auto h-7 rounded-md border border-input bg-surface px-2 text-xs"
                >
                  <option value="">+ Add checklist…</option>
                  {checklistTemplates
                    .filter(
                      (t) => !checklists.some((c) => c.templateId === t.id),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
              {checklists.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No checklist running — add Onboarding, Returning or Exit.
                </p>
              ) : (
                checklists.map((c, ci) => {
                  const tpl = checklistTemplateById(c.templateId);
                  if (!tpl) return null;
                  const done = c.checked.filter(Boolean).length;
                  const pct = Math.round((done / tpl.items.length) * 100);
                  return (
                    <details
                      key={c.templateId}
                      className="group mb-2 rounded-lg border border-border bg-surface/40"
                      open={pct < 100}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2 p-2.5 [&::-webkit-details-marker]:hidden">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{tpl.name}</span>
                        <span className="tnum ml-auto text-xs text-muted-foreground">
                          {done}/{tpl.items.length} · {pct}%
                        </span>
                      </summary>
                      <div className="px-2.5 pb-1">
                        <Progress value={pct} tone={pct === 100 ? "success" : "brand"} />
                      </div>
                      <ul className="flex flex-col gap-0.5 p-2.5 pt-1.5">
                        {tpl.items.map((item, ii) => (
                          <li key={ii}>
                            <label className="flex cursor-pointer items-start gap-2 rounded-md p-1 transition-colors hover:bg-accent/40">
                              <input
                                type="checkbox"
                                checked={c.checked[ii] ?? false}
                                onChange={() => toggleChecklistItem(ci, ii)}
                                className="mt-0.5 h-3.5 w-3.5 accent-[hsl(var(--brand))]"
                              />
                              <span
                                className={cn(
                                  "min-w-0 flex-1 text-xs leading-snug",
                                  c.checked[ii] &&
                                    "text-muted-foreground line-through",
                                )}
                              >
                                <span className="mr-1 font-mono text-[0.6rem] font-bold text-muted-foreground">
                                  [{item.owner}]
                                </span>
                                {item.label}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })
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
            <div className="flex max-h-[52vh] flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-slim">
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

/* ------------------------------------------------------------------ */
/* Trello-style inline custom fields (C24)                             */
/* ------------------------------------------------------------------ */

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-transparent bg-surface/60 px-1.5 text-xs font-semibold transition-colors hover:border-input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FieldInput({
  label,
  value,
  numeric = false,
  onCommit,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={draft}
        inputMode={numeric ? "numeric" : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-8 rounded-md border border-transparent bg-surface/60 px-1.5 text-xs font-semibold transition-colors hover:border-input focus:border-input focus:outline-none"
      />
    </label>
  );
}
