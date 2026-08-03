"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, IdCard, NotebookPen, Sparkles } from "lucide-react";

import {
  ManagedSelect,
  ManagementCard,
} from "@/app/(staff)/staff/athletes/[athleteId]/profile-panels";
import { RichTextComposer, RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  athletes,
  bucketLabel,
  relTime,
  statusLabel,
  type AthleteStatus,
  type MemberNote,
} from "@/lib/demo/data";
import { staffByName } from "@/lib/demo/staff";
import type { TrainingGroup } from "@/lib/demo/training";

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
