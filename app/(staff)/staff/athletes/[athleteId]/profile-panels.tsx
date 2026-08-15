"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  History,
  IdCard,
  LinkIcon,
  Pencil,
  Plus,
  Salad,
  Settings2,
  Target,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  athletes,
  bucketLabel,
  fmtDay,
  fmtFullDay,
  money2,
  statusLabel,
  type Athlete,
  type AthleteProfile,
  type AthleteStatus,
} from "@/lib/demo/data";
import { billingMeta } from "@/lib/demo/status";
import {
  assignmentsForAthlete,
  staffMembers,
} from "@/lib/demo/staff";
import { nutritionProtocols } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/**
 * Round 6 profile panels, round-8 pass: the Type/Focus manage gears and
 * Delete Member are admin-only (C15); Nutrition gained an in-place protocol
 * editor (C13); Instagram is a selectable @handle and email a mailto link
 * (C16); coaches see only the billing status pill (C18). The links editor and
 * management card are exported for the group profile to reuse (C21).
 */

const STATUS_TONE: Record<AthleteStatus, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  paused: "warning",
  inactive: "neutral",
};

const STATUS_HELP: Record<AthleteStatus, string> = {
  active: "Training normally — programs, booking and billing all run.",
  paused:
    "On hold (seasonal break or retention hold): login stays on, no programs run. The follow-up date drives the call.",
  inactive: "Account disabled — no login. The record stays unless deleted.",
};

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

/* ------------------------------------------------------------------ */
/* P9 — ManagedSelect: a dropdown whose OPTIONS are manageable         */
/* (add / rename / delete) from a small gear popover; the option list  */
/* persists in localStorage.                                           */
/* ------------------------------------------------------------------ */

export function ManagedSelect({
  label,
  storageKey,
  defaults,
  value,
  onChange,
  manageable = true,
}: {
  label: string;
  storageKey: string;
  defaults: string[];
  value: string;
  onChange: (v: string) => void;
  /** C15 — the manage gear (add/rename/delete options) is admin-only. */
  manageable?: boolean;
}) {
  const [options, setOptions] = useState<string[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) setOptions(parsed);
      }
    } catch {
      /* corrupted storage — keep defaults */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(options));
    } catch {
      /* storage full/blocked — options still work in-memory */
    }
  }, [options, loaded, storageKey]);

  // The current value always renders, even if its option was deleted.
  const shown = options.includes(value) ? options : [value, ...options];

  function addOption() {
    const v = addDraft.trim();
    setAddDraft("");
    if (!v || options.includes(v)) return;
    setOptions((prev) => [...prev, v]);
  }

  function commitRename(i: number) {
    const next = editDraft.trim();
    setEditIdx(null);
    if (!next || next === options[i] || options.includes(next)) return;
    const prevName = options[i];
    setOptions((prev) => prev.map((o, j) => (j === i ? next : o)));
    if (value === prevName) onChange(next);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(FIELD_LABEL, "flex items-center justify-between")}>
        {label}
        {manageable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`Manage ${label} options`}
            title={`Manage ${label} options — add, rename or delete`}
            className="rounded p-0.5 transition-colors hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </span>
      <div className="relative">
        <select
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
        >
          {shown.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {open ? (
          <>
            <div
              className="fixed inset-0 z-40"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border bg-popover p-2 shadow-raised">
              <p className="eyebrow px-1.5 pb-1.5">{label} options</p>
              <ul className="flex flex-col gap-0.5">
                {options.map((o, i) => (
                  <li
                    key={`${o}-${i}`}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent/40"
                  >
                    {editIdx === i ? (
                      <input
                        autoFocus
                        value={editDraft}
                        aria-label={`Rename ${o}`}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => commitRename(i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") setEditIdx(null);
                        }}
                        className="h-7 min-w-0 flex-1 rounded border border-input bg-surface px-1.5 text-sm focus:outline-none"
                      />
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate">{o}</span>
                        <button
                          type="button"
                          aria-label={`Rename ${o}`}
                          title="Rename"
                          onClick={() => {
                            setEditIdx(i);
                            setEditDraft(o);
                          }}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${o}`}
                          title="Delete"
                          onClick={() =>
                            setOptions((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-1.5 flex items-center gap-1.5 border-t border-border/60 pt-1.5">
                <Input
                  value={addDraft}
                  placeholder="Add option…"
                  className="h-7 flex-1 text-xs"
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addOption();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!addDraft.trim()}
                  aria-label={`Add ${label} option`}
                  onClick={addOption}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* P9 — Details: status lifecycle, manageable Type/Focus, Sex,         */
/* Birthday "mmm-dd-yyyy (age)" and the double-confirm Delete Member.  */
/* ------------------------------------------------------------------ */

function birthdayLabel(dob: string | undefined, yearOfBirth: number): string {
  if (!dob) {
    return `${yearOfBirth} (${new Date().getFullYear() - yearOfBirth})`;
  }
  const d = new Date(`${dob.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const beforeBirthday =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeBirthday) age -= 1;
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}-${d.getFullYear()} (${age})`;
}

export function DetailsCard({
  athlete,
  dob,
  admin,
}: {
  athlete: Athlete;
  dob?: string;
  /** C15 — manage gears + Delete Member render for admin/owner only. */
  admin: boolean;
}) {
  const [status, setStatus] = useState<AthleteStatus>(athlete.status);
  const [followUp, setFollowUp] = useState<string>(
    athlete.followUpDate ? athlete.followUpDate.slice(0, 10) : "",
  );
  const [bucket, setBucket] = useState(bucketLabel[athlete.bucket]);
  const [focus, setFocus] = useState(athlete.sport);
  const [deleted, setDeleted] = useState(false);
  // Delete Member is a two-step confirm: the first click ARMS the button for
  // ~4s ("Really delete?…"), the second click within that window deletes.
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimer.current) window.clearTimeout(armTimer.current);
    },
    [],
  );

  const focusDefaults = Array.from(
    new Set([...athletes.map((a) => a.sport), athlete.sport]),
  ).sort();

  if (deleted) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Member deleted (demo — refresh restores the record).
        </CardContent>
      </Card>
    );
  }

  function handleDeleteClick() {
    if (!armed) {
      setArmed(true);
      armTimer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (armTimer.current) window.clearTimeout(armTimer.current);
    setDeleted(true);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Details</h3>
          <Pill tone={STATUS_TONE[status]} dot className="ml-auto">
            {statusLabel[status]}
          </Pill>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-0.5">
            <span className={FIELD_LABEL}>Status</span>
            <select
              value={status}
              aria-label="Member status"
              onChange={(e) => setStatus(e.target.value as AthleteStatus)}
              className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
            >
              {(Object.keys(statusLabel) as AthleteStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>

          {status === "paused" ? (
            <label className="col-span-2 flex items-center gap-2 rounded-lg border border-border bg-surface/50 p-2.5">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="text-xs font-medium text-muted-foreground">
                Follow up
              </span>
              <input
                type="date"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                aria-label="Follow-up date"
                className="tnum ml-auto rounded-md border border-input bg-card px-2 py-1 text-xs font-semibold"
              />
            </label>
          ) : null}

          <ManagedSelect
            label="Type"
            storageKey="aos-member-type-options"
            defaults={Object.values(bucketLabel)}
            value={bucket}
            onChange={setBucket}
            manageable={admin}
          />
          <ManagedSelect
            label="Focus"
            storageKey="aos-member-focus-options"
            defaults={focusDefaults}
            value={focus}
            onChange={setFocus}
            manageable={admin}
          />

          <div className="flex flex-col gap-0.5">
            <span className={FIELD_LABEL}>Sex</span>
            <div className="flex h-9 items-center rounded-md bg-surface/60 px-2.5 text-sm font-medium">
              {athlete.gender}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={FIELD_LABEL}>Birthday</span>
            <div className="tnum flex h-9 items-center rounded-md bg-surface/60 px-2.5 text-sm font-medium">
              {birthdayLabel(dob, athlete.yearOfBirth)}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-pretty">
          {STATUS_HELP[status]}
        </p>

        <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-3">
          <span className="text-[0.7rem] text-muted-foreground">
            Saves locally in this demo.
          </span>
          {/* C15 — deleting a member is admin/owner only */}
          {admin ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={cn(
                "text-right text-xs transition-colors",
                armed
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground/70 hover:text-destructive",
              )}
            >
              {armed ? (
                <>Really delete? This can&apos;t be undone — click again to confirm</>
              ) : (
                "Delete Member"
              )}
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* P4 — Nutrition dropdown in the top action row. "none" leads with    */
/* Enable nutrition (Standard/Pro); otherwise switch tier or disable.  */
/* ------------------------------------------------------------------ */

const NUTRITION_LABEL: Record<Athlete["nutrition"], string> = {
  none: "None",
  standard: "Standard",
  pro: "Pro",
};

/** R20 — one saved protocol version: who, when, and the full field snapshot. */
interface ProtocolRevision {
  id: string;
  date: string;
  coach: string;
  summary: string;
  snapshot: {
    summary: string;
    meals: string[];
    supplements: string[];
    notes: string;
  };
}

/** Rough popover height budget for the flip check (R19). */
const NUTRITION_MENU_SPACE = 260;

export function NutritionButton({
  athleteId,
  initial,
}: {
  athleteId: string;
  initial: Athlete["nutrition"];
}) {
  const [tier, setTier] = useState<Athlete["nutrition"]>(initial);
  const [open, setOpen] = useState(false);
  // R19 — the dropdown clamps to the viewport: right-aligned to the button,
  // scrollable when tall, and it FLIPS above when the bottom edge is near.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  function toggleOpen() {
    if (!open && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setDropUp(
        window.innerHeight - rect.bottom < NUTRITION_MENU_SPACE &&
          rect.top > NUTRITION_MENU_SPACE,
      );
    }
    setOpen((v) => !v);
  }
  // C13 — the in-place protocol editor, seeded from the member's protocol.
  const seed = nutritionProtocols[athleteId];
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState(seed?.summary ?? "");
  const [meals, setMeals] = useState<string[]>(() =>
    seed
      ? seed.exampleMeals.map((m) => `${m.meal} — ${m.example}`)
      : [
          "Breakfast — protein + healthy fats",
          "Lunch — meat + vegetables",
          "Dinner — meat + vegetables",
        ],
  );
  const [supplements, setSupplements] = useState<string[]>(() =>
    seed
      ? seed.supplements.map((s) => `${s.name} — ${s.dose}, ${s.timing}`)
      : ["Multivitamin — 2 caps, with meals"],
  );
  const [notes, setNotes] = useState(seed?.notes ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  // R20 — every save appends a revision (date + coach + snapshot); the list
  // persists per athlete and older versions can be previewed and restored.
  const revisionsKey = `aos-nutrition-revisions-${athleteId}`;
  const [revisions, setRevisions] = useState<ProtocolRevision[]>([]);
  const [revisionsLoaded, setRevisionsLoaded] = useState(false);
  const [viewing, setViewing] = useState<ProtocolRevision | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(revisionsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ProtocolRevision[];
        if (Array.isArray(parsed)) setRevisions(parsed);
      }
    } catch {
      /* corrupted storage — start empty */
    }
    setRevisionsLoaded(true);
  }, [revisionsKey]);

  useEffect(() => {
    if (!revisionsLoaded) return;
    try {
      window.localStorage.setItem(revisionsKey, JSON.stringify(revisions));
    } catch {
      /* storage full/blocked — revisions still work in-memory */
    }
  }, [revisions, revisionsLoaded, revisionsKey]);

  function pick(next: Athlete["nutrition"]) {
    setTier(next);
    setOpen(false);
  }

  function saveProtocol() {
    // R20 — append this save to the revision history (newest first).
    setRevisions((prev) => [
      {
        id: `rev-${Date.now()}`,
        date: new Date().toISOString(),
        coach: "Coach Ellis",
        summary: "Protocol updated",
        snapshot: {
          summary,
          meals: [...meals],
          supplements: [...supplements],
          notes,
        },
      },
      ...prev,
    ]);
    setSavedFlash(true);
    window.setTimeout(() => {
      setSavedFlash(false);
      setEditing(false);
    }, 900);
  }

  /** R20 — swap the current fields to a previous snapshot. */
  function restoreRevision(rev: ProtocolRevision) {
    setSummary(rev.snapshot.summary);
    setMeals([...rev.snapshot.meals]);
    setSupplements([...rev.snapshot.supplements]);
    setNotes(rev.snapshot.notes);
    setViewing(null);
  }

  function closeEditor() {
    setEditing(false);
    setViewing(null);
  }

  // R20 — while previewing a revision the form shows that snapshot read-only.
  const readOnly = viewing !== null;
  const shownSummary = viewing ? viewing.snapshot.summary : summary;
  const shownMeals = viewing ? viewing.snapshot.meals : meals;
  const shownSupplements = viewing ? viewing.snapshot.supplements : supplements;
  const shownNotes = viewing ? viewing.snapshot.notes : notes;

  function setLine(
    setter: (updater: (prev: string[]) => string[]) => void,
    i: number,
    v: string,
  ) {
    setter((prev) => prev.map((line, j) => (j === i ? v : line)));
  }

  function removeLine(
    setter: (updater: (prev: string[]) => string[]) => void,
    i: number,
  ) {
    setter((prev) => prev.filter((_, j) => j !== i));
  }

  return (
    <div className="relative" ref={wrapRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleOpen}
        aria-expanded={open}
      >
        <Salad className="h-4 w-4" />
        Nutrition{tier !== "none" ? ` · ${NUTRITION_LABEL[tier]}` : ""}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          {/* R19 — right-aligned, viewport-clamped, flips above near the
              bottom edge so the menu never falls off-screen */}
          <div
            className={cn(
              "absolute right-0 z-50 max-h-[min(60vh,20rem)] w-56 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-raised scrollbar-slim",
              dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
          >
            {tier === "none" ? (
              <>
                <p className="eyebrow px-2 pb-1.5">Enable nutrition</p>
                <MenuButton onClick={() => pick("standard")}>
                  Standard
                </MenuButton>
                <MenuButton onClick={() => pick("pro")}>Pro</MenuButton>
              </>
            ) : (
              <>
                <p className="eyebrow px-2 pb-1.5">
                  Current tier · {NUTRITION_LABEL[tier]}
                </p>
                {/* C13 — edit what the member sees in their portal */}
                <MenuButton
                  onClick={() => {
                    setEditing(true);
                    setOpen(false);
                  }}
                >
                  Edit nutrition protocol…
                </MenuButton>
                <MenuButton
                  onClick={() => pick(tier === "pro" ? "standard" : "pro")}
                >
                  Switch to {tier === "pro" ? "Standard" : "Pro"}
                </MenuButton>
                <MenuButton danger onClick={() => pick("none")}>
                  Disable nutrition
                </MenuButton>
              </>
            )}
            <p className="px-2 pt-1.5 text-[0.7rem] text-muted-foreground">
              Saves locally in this demo.
            </p>
          </div>
        </>
      ) : null}

      {/* C13 — the protocol editor dialog (R20: with revision history) */}
      {editing ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden
            onClick={closeEditor}
          />
          <div
            role="dialog"
            aria-label="Edit nutrition protocol"
            className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised"
          >
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <Salad className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-base">
                Nutrition Protocol · {NUTRITION_LABEL[tier]}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close protocol editor"
                className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-5 scrollbar-slim">
              {/* R20 — read-only preview banner while viewing a revision */}
              {viewing ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-info/40 bg-info/10 p-3 text-xs font-medium text-info">
                  <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    Viewing the {fmtFullDay(viewing.date)} version (
                    {viewing.coach}) — read-only preview.
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewing(null)}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    Back to current
                  </button>
                </div>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Protocol summary</span>
                <Textarea
                  rows={3}
                  value={shownSummary}
                  disabled={readOnly}
                  placeholder="The one-paragraph rule this member eats by…"
                  className="text-sm leading-relaxed"
                  onChange={(e) => setSummary(e.target.value)}
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL}>Meal checklist</span>
                {shownMeals.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={m}
                      disabled={readOnly}
                      aria-label={`Meal line ${i + 1}`}
                      className="h-9 flex-1 text-sm"
                      onChange={(e) => setLine(setMeals, i, e.target.value)}
                    />
                    {!readOnly ? (
                      <button
                        type="button"
                        aria-label={`Remove meal line ${i + 1}`}
                        title="Remove line"
                        onClick={() => removeLine(setMeals, i)}
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => setMeals((prev) => [...prev, ""])}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add meal line
                  </button>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL}>Supplements</span>
                {shownSupplements.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={s}
                      disabled={readOnly}
                      aria-label={`Supplement ${i + 1}`}
                      className="h-9 flex-1 text-sm"
                      onChange={(e) =>
                        setLine(setSupplements, i, e.target.value)
                      }
                    />
                    {!readOnly ? (
                      <button
                        type="button"
                        aria-label={`Remove supplement ${i + 1}`}
                        title="Remove supplement"
                        onClick={() => removeLine(setSupplements, i)}
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => setSupplements((prev) => [...prev, ""])}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add supplement
                  </button>
                ) : null}
              </div>

              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Notes</span>
                <Textarea
                  rows={3}
                  value={shownNotes}
                  disabled={readOnly}
                  placeholder="Weigh-in cadence, hard rules, anything the member should read…"
                  className="text-sm leading-relaxed"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              {/* R20 — Revisions: every save on file, newest first */}
              <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
                <span className={FIELD_LABEL}>Revisions</span>
                {revisions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-surface/30 p-3 text-xs text-muted-foreground">
                    No revisions yet — every save is recorded here with the
                    date and coach.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {revisions.map((rev) => (
                      <li
                        key={rev.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2",
                          viewing?.id === rev.id &&
                            "border-brand/50 bg-brand/[0.05]",
                        )}
                      >
                        <History
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-xs">
                          <span className="tnum font-semibold">
                            {fmtFullDay(rev.date)}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {rev.coach} · {rev.summary}
                          </span>
                        </span>
                        {viewing?.id === rev.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setViewing(null)}
                          >
                            Back to current
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setViewing(rev)}
                          >
                            View
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                This is exactly what the member sees in their portal. Saves
                locally in this demo.
              </span>
              <span className="ml-auto flex items-center gap-2">
                {savedFlash ? (
                  <Pill tone="success" dot>
                    Saved
                  </Pill>
                ) : null}
                <Button variant="ghost" size="sm" onClick={closeEditor}>
                  Cancel
                </Button>
                {viewing ? (
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => restoreRevision(viewing)}
                  >
                    Restore this version
                  </Button>
                ) : (
                  <Button variant="brand" size="sm" onClick={saveProtocol}>
                    Save protocol
                  </Button>
                )}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  danger = false,
  onClick,
  children,
}: {
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent/50",
        danger && "text-destructive",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* P11 — Contact & Links: the external stack as full-width button rows */
/* with pencil edit, plus member and parent/emergency contact columns. */
/* ------------------------------------------------------------------ */

interface ProfileLink {
  label: string;
  url: string;
}

const DEFAULT_LINKS: ProfileLink[] = [
  { label: "Drive", url: "https://drive.google.com" },
  { label: "Quo", url: "https://quo.com" },
  { label: "Google Contact", url: "https://contacts.google.com" },
  { label: "Brevo", url: "https://brevo.com" },
  { label: "Square", url: "https://squareup.com" },
];

function normalizeUrl(u: string): string {
  const v = u.trim();
  return v && !/^https?:\/\//.test(v) ? `https://${v}` : v;
}

/** The editable external-link rows — shared by the member profile's Contact &
 *  Links card and the group profile's Links card (C21). */
export function LinksEditor({
  storageKey,
  defaults = DEFAULT_LINKS,
}: {
  storageKey: string;
  defaults?: ProfileLink[];
}) {
  const [links, setLinks] = useState<ProfileLink[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addUrl, setAddUrl] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setLinks(JSON.parse(raw) as ProfileLink[]);
    } catch {
      /* corrupted storage — keep defaults */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(links));
    } catch {
      /* storage full/blocked — links still work in-memory */
    }
  }, [links, loaded, storageKey]);

  function saveEdit(i: number) {
    const l = editLabel.trim();
    if (!l) return;
    const u = normalizeUrl(editUrl);
    setLinks((prev) =>
      prev.map((link, j) => (j === i ? { label: l, url: u } : link)),
    );
    setEditIdx(null);
  }

  function addLink() {
    const l = addLabel.trim();
    if (!l) return;
    setLinks((prev) => [...prev, { label: l, url: normalizeUrl(addUrl) }]);
    setAddLabel("");
    setAddUrl("");
    setAdding(false);
  }

  return (
    <div>
      <div className="mt-2 flex flex-col gap-1.5">
            {links.map((link, i) =>
              editIdx === i ? (
                <div
                  key={`edit-${link.label}-${i}`}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/[0.03] p-2.5"
                >
                  <div className="grid gap-1">
                    <span className={FIELD_LABEL}>Label</span>
                    <Input
                      autoFocus
                      value={editLabel}
                      className="h-8 w-36 text-xs"
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <span className={FIELD_LABEL}>URL</span>
                    <Input
                      value={editUrl}
                      placeholder="https://…"
                      className="h-8 w-48 text-xs"
                      onChange={(e) => setEditUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(i);
                      }}
                    />
                  </div>
                  <Button
                    variant="brand"
                    size="sm"
                    disabled={!editLabel.trim()}
                    onClick={() => saveEdit(i)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditIdx(null)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    aria-label={`Remove ${link.label} link`}
                    title="Remove link"
                    onClick={() => {
                      setLinks((prev) => prev.filter((_, j) => j !== i));
                      setEditIdx(null);
                    }}
                    className="ml-auto rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  key={`${link.label}-${i}`}
                  className="flex h-9 w-full items-stretch overflow-hidden rounded-md border border-input bg-surface text-sm font-medium"
                >
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 transition-colors hover:bg-accent/50"
                    >
                      <LinkIcon
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{link.label}</span>
                    </a>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-2 px-3">
                      <LinkIcon
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="truncate">{link.label}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Edit ${link.label} link`}
                    title="Edit label + URL"
                    onClick={() => {
                      setEditIdx(i);
                      setEditLabel(link.label);
                      setEditUrl(link.url);
                      setAdding(false);
                    }}
                    className="flex items-center border-l border-border/60 px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            )}

            {adding ? (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/[0.03] p-2.5">
                <div className="grid gap-1">
                  <span className={FIELD_LABEL}>Label</span>
                  <Input
                    autoFocus
                    value={addLabel}
                    placeholder="e.g. TrueCoach"
                    className="h-8 w-36 text-xs"
                    onChange={(e) => setAddLabel(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <span className={FIELD_LABEL}>URL</span>
                  <Input
                    value={addUrl}
                    placeholder="https://…"
                    className="h-8 w-48 text-xs"
                    onChange={(e) => setAddUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addLink();
                    }}
                  />
                </div>
                <Button
                  variant="brand"
                  size="sm"
                  disabled={!addLabel.trim()}
                  onClick={addLink}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdding(true);
                  setEditIdx(null);
                }}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
              >
                <Plus className="h-3.5 w-3.5" />
                Add link
              </button>
            )}
          </div>
      <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
        The external stack changes — edit or add links any time. Saves
        locally in this demo.
      </p>
    </div>
  );
}

export function ContactLinksCard({
  athlete,
  profile,
}: {
  athlete: Athlete;
  profile?: AthleteProfile;
}) {
  const guardian = profile?.guardian;
  const emergency = profile?.emergencyContact;
  // C16 — the app renders the @ itself; stored handles may carry one or not.
  const igHandle = profile?.instagram?.replace(/^@/, "");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Contact &amp; Links</h3>
        </div>

        {/* Links — full-width rows; Program/Assessment/Chat live in the top
            buttons now, so only the external stack remains here. */}
        <div>
          <span className="eyebrow">Links</span>
          <LinksEditor storageKey={`aos-links-${athlete.id}`} />
        </div>

        {/* Contact — member on the left, parent/emergency on the right */}
        <div>
          <span className="eyebrow">Contact</span>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              <p className={FIELD_LABEL}>Member</p>
              <p className="font-medium">{athlete.name}</p>
              {profile ? (
                <>
                  <p>{profile.phone}</p>
                  {/* C16 — email is a mailto link */}
                  <p className="break-words">
                    <a
                      href={`mailto:${profile.email}`}
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      {profile.email}
                    </a>
                  </p>
                  <p className="text-pretty">
                    {profile.address.street}, {profile.address.city}{" "}
                    {profile.address.region} {profile.address.postal}
                  </p>
                  {/* C16 — "Instagram: @handle", selectable AND a real link */}
                  {igHandle ? (
                    <p>
                      Instagram:{" "}
                      <a
                        href={`https://instagram.com/${igHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="select-all text-brand-ink underline-offset-2 hover:underline"
                      >
                        @{igHandle}
                      </a>
                    </p>
                  ) : null}
                  {profile.hudl ? (
                    <a
                      href={normalizeUrl(profile.hudl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-ink underline-offset-2 hover:underline"
                    >
                      HUDL profile
                    </a>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">No profile on file yet.</p>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p className={FIELD_LABEL}>Parent / Emergency contact</p>
              {guardian ? (
                <>
                  <p className="font-medium">{guardian.name}</p>
                  <p className="text-muted-foreground">{guardian.relation}</p>
                  <p>{guardian.phone}</p>
                  <p className="break-words">{guardian.email}</p>
                </>
              ) : emergency ? (
                <>
                  <p className="font-medium">{emergency.name}</p>
                  <p className="text-muted-foreground">{emergency.relation}</p>
                  <p>{emergency.phone}</p>
                </>
              ) : (
                <p className="text-muted-foreground">None on file.</p>
              )}
            </div>
          </div>
          <p className="mt-2 text-[0.7rem] text-muted-foreground">
            Synced from the member&apos;s profile — they keep it current.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* P12 — Team Management: Program | Manage side by side (labels above, */
/* full-width selects), Assistants full-width beneath.                 */
/* ------------------------------------------------------------------ */

export function TeamManagementCard({ athlete }: { athlete: Athlete }) {
  const base = assignmentsForAthlete(athlete.id);
  return (
    <ManagementCard
      initialProgramming={base.find((a) => a.role === "programming")?.staffId ?? ""}
      initialManagement={base.find((a) => a.role === "management")?.staffId ?? ""}
      initialAssistants={base
        .filter((a) => a.role === "assistant")
        .map((a) => a.staffId)}
      footnote="Assignments drive who's in this member's chat thread and whose queue they appear in. Saves locally in this demo."
    />
  );
}

/** The Program / Manage / Assistants selects — shared by member and group
 *  profiles (C21: "same Team Management section as members"). */
export function ManagementCard({
  initialProgramming,
  initialManagement,
  initialAssistants,
  footnote,
}: {
  initialProgramming: string;
  initialManagement: string;
  initialAssistants: string[];
  footnote: string;
}) {
  const [programming, setProgramming] = useState(initialProgramming);
  const [management, setManagement] = useState(initialManagement);
  // C9: MULTIPLE assistant coaches — add appends underneath, each removable.
  const [assistants, setAssistants] = useState<string[]>(initialAssistants);

  const availableAssistants = staffMembers.filter(
    (s) => !assistants.includes(s.id),
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Team Management</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { label: "Program", value: programming, set: setProgramming },
              { label: "Manage", value: management, set: setManagement },
            ] as const
          ).map(({ label, value, set }) => (
            <label key={label} className="flex flex-col gap-1">
              <span className={FIELD_LABEL}>{label}</span>
              <select
                value={value}
                aria-label={`${label} coach`}
                onChange={(e) => set(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
              >
                <option value="">—</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {/* Assistants — a full-width list, not a single slot */}
        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Assistants</span>
          {assistants.map((id) => {
            const s = staffMembers.find((m) => m.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-2.5 py-1.5 text-sm"
              >
                <AthleteAvatar
                  initials={s.initials}
                  hue={s.hue}
                  size="sm"
                  className="h-6 w-6 text-[0.55rem]"
                />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${s.name} as assistant`}
                  onClick={() =>
                    setAssistants((prev) => prev.filter((a) => a !== id))
                  }
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
          <select
            value=""
            aria-label="Add assistant coach"
            onChange={(e) => {
              if (e.target.value) {
                setAssistants((prev) => [...prev, e.target.value]);
              }
            }}
            className="h-9 w-full rounded-md border border-dashed border-input bg-surface px-2.5 text-sm text-muted-foreground"
          >
            <option value="">+ Add assistant…</option>
            {availableAssistants.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[0.7rem] text-muted-foreground">{footnote}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* C18 — Financial: coaches see ONLY the billing-status pill; balances,*/
/* invoice amounts and the Manage button are admin/owner-only.         */
/* ------------------------------------------------------------------ */

export function FinancialCard({
  athlete,
  admin,
}: {
  athlete: Athlete;
  admin: boolean;
}) {
  const billing = billingMeta[athlete.billing.state];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Financial</h3>
          {admin ? (
            <span className="ml-auto">
              <Button asChild variant="outline" size="sm">
                <Link href={"/staff/billing" as Route}>Manage</Link>
              </Button>
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          {/* Everyone sees the status pill — is this member in good standing? */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-3">
            <span className="font-medium">{athlete.planName}</span>
            <Pill tone={billing.tone} dot>
              {billing.label}
            </Pill>
          </div>
          {admin ? (
            <>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Next invoice</span>
                <span className="tnum font-semibold text-foreground">
                  {fmtDay(athlete.billing.nextInvoice)}
                </span>
              </div>
              {athlete.billing.amountDueCents > 0 ? (
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>Outstanding</span>
                  <span className="tnum font-semibold text-destructive">
                    {money2(athlete.billing.amountDueCents)}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
          <p className="px-1 text-[0.7rem] text-muted-foreground">
            {admin
              ? "Manage opens Billing — mark paid / cancel live there; Square handles cards."
              : "Coaches see the billing status only — balances and actions are admin-only."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* P17 — Goals & Medical History: GOALS, PAST INJURIES and CURRENT     */
/* INJURIES / LIMITATIONS (the last one feeds the session Huddle       */
/* Brief).                                                             */
/* ------------------------------------------------------------------ */

export function GoalsMedicalCard({
  initialGoals,
  initialPastInjuries,
  initialLimitations,
}: {
  initialGoals: string;
  initialPastInjuries: string;
  initialLimitations: string;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [past, setPast] = useState(initialPastInjuries);
  const [limitations, setLimitations] = useState(initialLimitations);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-brand-ink" aria-hidden />
          <h3 className="text-base">Goals &amp; Medical History</h3>
        </div>

        <MedicalField
          label="GOALS"
          rows={3}
          value={goals}
          placeholder="What this member is training toward…"
          onChange={setGoals}
        />
        <MedicalField
          label="PAST INJURIES"
          rows={2}
          value={past}
          placeholder="Injury history worth knowing…"
          onChange={setPast}
        />
        <MedicalField
          label="CURRENT INJURIES / LIMITATIONS"
          rows={3}
          value={limitations}
          placeholder="Anything limiting training right now…"
          caption="Shows on the session Huddle Brief"
          onChange={setLimitations}
        />

        <p className="text-[0.7rem] text-muted-foreground">
          Saves locally in this demo.
        </p>
      </CardContent>
    </Card>
  );
}

function MedicalField({
  label,
  rows,
  value,
  placeholder,
  caption,
  onChange,
}: {
  label: string;
  rows: number;
  value: string;
  placeholder: string;
  caption?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        className="text-sm leading-relaxed"
        onChange={(e) => onChange(e.target.value)}
      />
      {caption ? (
        <span className="text-[0.7rem] text-muted-foreground">{caption}</span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* C11 — avatar with an upload affordance (staff can change a client's */
/* photo; avatars surface on the roster + huddle so coaches recognize  */
/* faces).                                                             */
/* ------------------------------------------------------------------ */

export function AvatarUpload({
  initials,
  hue,
  name,
  uploadLabel,
}: {
  initials: string;
  hue: number;
  name: string;
  /** R23 — override for non-photo uploads, e.g. "Upload logo (demo)". */
  uploadLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [updated, setUpdated] = useState(false);

  return (
    <span className="relative inline-flex shrink-0">
      <AthleteAvatar initials={initials} hue={hue} size="xl" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={uploadLabel ?? `Change ${name}'s photo`}
        title={
          updated
            ? "Updated (saves locally in this demo)"
            : (uploadLabel ?? "Change photo")
        }
        className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-foreground"
      >
        {updated ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) setUpdated(true);
          e.target.value = "";
        }}
      />
    </span>
  );
}

/** Follow-up strip shown at the top for paused members. */
export function FollowUpBanner({ athlete }: { athlete: Athlete }) {
  if (athlete.status === "active" || !athlete.followUpDate) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3.5 text-sm font-medium",
        athlete.status === "paused"
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-info/40 bg-info/10 text-info",
      )}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        {statusLabel[athlete.status]} member — follow up{" "}
        {fmtDay(athlete.followUpDate)} — the retention call.
      </span>
    </div>
  );
}
