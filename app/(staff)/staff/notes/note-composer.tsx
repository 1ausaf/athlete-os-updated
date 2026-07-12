"use client";

import { useState } from "react";
import { CheckCircle2, NotebookPen, Sparkles } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { relTime, type Athlete } from "@/lib/demo/data";

export interface FeedNote {
  id: string;
  athleteId: string;
  athleteName: string;
  initials: string;
  hue: number;
  coach: string;
  date: string;
  context: string;
  action: string;
  plan: string;
}

type AthleteLite = Pick<Athlete, "id" | "name" | "initials" | "hue">;

/**
 * Client notes hub: the composer plus the live feed. Saving a note prepends it
 * to local state (optimistic, no backend), so freshly authored notes appear at
 * the top of the feed immediately with a success flash.
 */
export function NotesHub({
  athletes,
  initialNotes,
  authorName,
}: {
  athletes: AthleteLite[];
  initialNotes: FeedNote[];
  authorName: string;
}) {
  const [notes, setNotes] = useState<FeedNote[]>(initialNotes);

  return (
    <>
      <NoteComposer
        athletes={athletes}
        authorName={authorName}
        onAdd={(note) => setNotes((prev) => [note, ...prev])}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg">Recent CAP notes</h2>
        <span className="text-xs text-muted-foreground">
          {notes.length} across all athletes · newest first
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {notes.map((note) => (
          <CapNoteCard key={note.id} note={note} />
        ))}
      </div>
    </>
  );
}

function NoteComposer({
  athletes,
  onAdd,
  authorName,
}: {
  athletes: AthleteLite[];
  onAdd: (note: FeedNote) => void;
  authorName: string;
}) {
  const [athleteId, setAthleteId] = useState(athletes[0]?.id ?? "");
  const [context, setContext] = useState("");
  const [action, setAction] = useState("");
  const [plan, setPlan] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const selected = athletes.find((a) => a.id === athleteId) ?? athletes[0];
  const canSave =
    Boolean(selected) &&
    context.trim().length > 0 &&
    action.trim().length > 0 &&
    plan.trim().length > 0;

  function handleSave() {
    if (!canSave || !selected) return;
    const note: FeedNote = {
      id: `cap-local-${Date.now()}`,
      athleteId: selected.id,
      athleteName: selected.name,
      initials: selected.initials,
      hue: selected.hue,
      coach: authorName,
      date: new Date().toISOString(),
      context: context.trim(),
      action: action.trim(),
      plan: plan.trim(),
    };
    onAdd(note);
    setContext("");
    setAction("");
    setPlan("");
    setFlash(`CAP note logged for ${selected.name}.`);
    window.setTimeout(() => setFlash(null), 3200);
  }

  return (
    <Card className="overflow-hidden bg-brand-sheen">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <NotebookPen className="h-5 w-5" />
            </span>
            <div>
              <span className="eyebrow">New CAP note</span>
              <p className="text-sm text-muted-foreground">
                Context · Action · Plan — the shared language of every session.
              </p>
            </div>
          </div>
          {selected ? (
            <div className="flex items-center gap-2">
              <AthleteAvatar
                initials={selected.initials}
                hue={selected.hue}
                size="sm"
              />
              <span className="text-sm font-semibold">{selected.name}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="cap-athlete">Athlete</Label>
          <select
            id="cap-athlete"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <CapField
            label="Context"
            hint="What did you see?"
            value={context}
            onChange={setContext}
            placeholder="Upper hinge day. Right scap control improving, no pain…"
          />
          <CapField
            label="Action"
            hint="What did you do?"
            value={action}
            onChange={setAction}
            placeholder="Held trap-bar at RPE 8, added 2 back-off sets of rows…"
          />
          <CapField
            label="Plan"
            hint="What's next?"
            value={plan}
            onChange={setPlan}
            placeholder="Progress to 3ct pause next session; retest grip Fri…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="brand" onClick={handleSave} disabled={!canSave}>
            <Sparkles className="h-4 w-4" />
            Save CAP note
          </Button>
          {flash ? (
            <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
              {flash}
            </Pill>
          ) : (
            <span className="text-xs text-muted-foreground">
              Saves locally to the feed below — demo, no data leaves this screen.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CapField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-[0.7rem] text-muted-foreground">{hint}</span>
      </div>
      <Textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="resize-none bg-card"
      />
    </div>
  );
}

/** Renders a single CAP note row in the feed (shared by page + composer). */
export function CapNoteCard({ note }: { note: FeedNote }) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)]">
        <div className="flex items-start gap-3">
          <AthleteAvatar initials={note.initials} hue={note.hue} size="lg" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight">
              {note.athleteName}
            </p>
            <p className="text-xs text-muted-foreground">
              {note.coach} · {relTime(note.date)}
            </p>
          </div>
        </div>
        <dl className="flex flex-col gap-2.5 text-sm">
          <CapLine label="C" text={note.context} />
          <CapLine label="A" text={note.action} />
          <CapLine label="P" text={note.plan} />
        </dl>
      </CardContent>
    </Card>
  );
}

function CapLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted font-mono text-[0.65rem] font-bold text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground/90">{text}</span>
    </div>
  );
}
