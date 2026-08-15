"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  IdCard,
  NotebookPen,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import {
  ManagedSelect,
  ManagementCard,
} from "@/app/(staff)/staff/athletes/[athleteId]/profile-panels";
import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { RichTextComposer, RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  athleteById,
  athletes,
  bucketLabel,
  relTime,
  statusLabel,
  type Athlete,
  type AthleteStatus,
  type MemberNote,
} from "@/lib/demo/data";
import { staffByName } from "@/lib/demo/staff";
import { trainingGroups, type TrainingGroup } from "@/lib/demo/training";

/**
 * Round 8 (C21): the group profile mirrors the member profile — these are the
 * group flavors of the Details card, the Team Management card and the Notes
 * panel (notes persist in localStorage per group).
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

const STATUS_TONE: Record<AthleteStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  paused: "warning",
  inactive: "neutral",
};

/* ------------------------------------------------------------------ */
/* Details — Status, Type, Focus, plan. No sex/birthday (C21).         */
/* ------------------------------------------------------------------ */

export function GroupDetailsCard({
  group,
  admin,
}: {
  group: TrainingGroup;
  admin: boolean;
}) {
  const [status, setStatus] = useState<AthleteStatus>("active");
  const [bucket, setBucket] = useState(bucketLabel[group.bucket]);
  const [focus, setFocus] = useState(group.focus);

  const focusDefaults = Array.from(
    new Set([...athletes.map((a) => a.sport), group.focus]),
  ).sort();

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
              aria-label="Group status"
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

          {/* Same manageable Type/Focus lists as members; gears admin-only */}
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

          <div className="col-span-2 flex flex-col gap-0.5">
            <span className={FIELD_LABEL}>Plan</span>
            <div className="flex h-9 items-center rounded-md bg-surface/60 px-2.5 text-sm font-medium">
              {group.planName}
            </div>
          </div>
        </div>

        <p className="text-[0.7rem] text-muted-foreground">
          Saves locally in this demo.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Group Members (R23) — rows open the member profile; each row can be */
/* REMOVED (confirm), existing un-grouped athletes are addable from a  */
/* select, and "New member…" onboards someone brand new.               */
/* ------------------------------------------------------------------ */

export function GroupMembersCard({
  group,
  admin,
}: {
  group: TrainingGroup;
  admin: boolean;
}) {
  const [memberIds, setMemberIds] = useState<string[]>(group.memberAthleteIds);

  const members = memberIds
    .map((id) => athleteById(id))
    .filter((a): a is Athlete => Boolean(a))
    .sort((a, b) => a.name.localeCompare(b.name));

  // R23/R44 — only EXISTING athletes not already in a group are addable.
  const groupedIds = new Set(
    trainingGroups.flatMap((g) =>
      g.id === group.id ? memberIds : g.memberAthleteIds,
    ),
  );
  const addable = athletes
    .filter((a) => a.status === "active" && !groupedIds.has(a.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Linked adds/removes shift the headline count with them.
  const totalCount =
    group.athleteCount + (memberIds.length - group.memberAthleteIds.length);

  function removeMember(a: Athlete) {
    if (
      window.confirm(
        `Remove ${a.name} from ${group.name}? Their member profile stays — they just leave the group.`,
      )
    ) {
      setMemberIds((prev) => prev.filter((id) => id !== a.id));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Group Members</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {totalCount} members — {members.length} with linked profiles
          </span>
        </div>

        {members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No linked profiles yet — all {totalCount} members train under the
            shared group program.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((a) => (
              <li key={a.id} className="flex items-center gap-1.5">
                <Link
                  href={`/staff/athletes/${a.id}` as Route}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-brand/40"
                >
                  <AthleteAvatar initials={a.initials} hue={a.hue} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {a.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {a.sport} · {a.age} · {a.gender}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                {admin ? (
                  <button
                    type="button"
                    aria-label={`Remove ${a.name} from the group`}
                    title="Remove from group"
                    onClick={() => removeMember(a)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {admin ? (
          <div className="flex flex-wrap items-center gap-2">
            {/* R23 — add an EXISTING athlete who isn't in a group yet */}
            <select
              value=""
              aria-label="Add an existing member to the group"
              onChange={(e) => {
                if (e.target.value) {
                  setMemberIds((prev) => [...prev, e.target.value]);
                }
              }}
              className="h-9 min-w-44 flex-1 rounded-md border border-dashed border-input bg-surface px-2.5 text-sm text-muted-foreground"
            >
              <option value="">+ Add member…</option>
              {addable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.sport}
                </option>
              ))}
            </select>
            {/* Brand-new people still go through onboarding */}
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/athletes/new?group=${group.id}` as Route}>
                <Plus className="h-4 w-4" />
                New member…
              </Link>
            </Button>
          </div>
        ) : null}
        <p className="text-[0.7rem] text-muted-foreground">
          Add member picks an existing athlete who isn&apos;t in a group yet;
          New member… onboards someone brand new into this group. Saves locally
          in this demo.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Team Management — the SAME Program/Manage/Assistants selects as a   */
/* member profile (C21), seeded from the group's coach list.           */
/* ------------------------------------------------------------------ */

export function GroupManagementCard({ group }: { group: TrainingGroup }) {
  const assistants = group.coachNames
    .filter(
      (n) => n !== group.programmingCoach && n !== group.managementCoach,
    )
    .map((n) => staffByName(n)?.id)
    .filter((id): id is string => Boolean(id));

  return (
    <ManagementCard
      initialProgramming={staffByName(group.programmingCoach)?.id ?? ""}
      initialManagement={staffByName(group.managementCoach)?.id ?? ""}
      initialAssistants={assistants}
      footnote="Assignments drive who sees this group in their queue and chat. Saves locally in this demo."
    />
  );
}

/* ------------------------------------------------------------------ */
/* Notes — the member profile's notes panel, persisted per group in    */
/* localStorage (C21).                                                 */
/* ------------------------------------------------------------------ */

export function GroupNotesPanel({
  groupId,
  groupName,
  authorName,
}: {
  groupId: string;
  groupName: string;
  authorName: string;
}) {
  const storageKey = `aos-group-notes-${groupId}`;
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draftHtml, setDraftHtml] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as MemberNote[];
        if (Array.isArray(parsed)) setNotes(parsed);
      }
    } catch {
      /* corrupted storage — start empty */
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {
      /* storage full/blocked — notes still work in-memory */
    }
  }, [notes, loaded, storageKey]);

  const canSave = draftHtml.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const note: MemberNote = {
      id: `note-group-${Date.now()}`,
      date: new Date().toISOString(),
      coach: authorName,
      body: draftHtml,
    };
    setNotes((prev) => [note, ...prev]);
    setDraftHtml("");
    setResetKey((k) => k + 1);
    setFlash(`Note logged for ${groupName}.`);
    window.setTimeout(() => setFlash(null), 3200);
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">Notes</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {notes.length} on file · newest first
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <RichTextComposer
            placeholder={`Write a note about ${groupName}…`}
            onChangeHtml={setDraftHtml}
            resetKey={resetKey}
            // R23 — group notes run longer; give the composer ~6 lines up front
            className="[&_.rich-text]:min-h-[9rem]"
            actions={
              <>
                {flash ? (
                  <Pill
                    tone="success"
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    {flash}
                  </Pill>
                ) : (
                  <span className="mr-auto text-xs text-muted-foreground">
                    Visible to all coaches · saves locally in this demo.
                  </span>
                )}
                <Button
                  variant="brand"
                  size="sm"
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  <Sparkles className="h-4 w-4" />
                  Save note
                </Button>
              </>
            }
          />
        </div>

        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No note yet — write the first one above.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-border bg-surface/50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">{note.coach}</span>
                  <span className="text-xs text-muted-foreground">
                    {relTime(note.date)}
                  </span>
                </div>
                <RichTextView html={note.body} className="text-foreground/90" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
