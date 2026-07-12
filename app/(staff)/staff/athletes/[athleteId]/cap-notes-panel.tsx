"use client";

import { useState } from "react";
import { CheckCircle2, NotebookPen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { relTime, type CapNote } from "@/lib/demo/data";

/**
 * The centerpiece of the athlete profile: this athlete's full CAP feed plus an
 * inline add-note composer. Saving prepends to local state (optimistic, no
 * backend) — the athlete is managed inside their own record, Trello-comment
 * style.
 */
export function CapNotesPanel({
  athleteFirstName,
  authorName,
  initialNotes,
}: {
  athleteFirstName: string;
  authorName: string;
  initialNotes: CapNote[];
}) {
  const [notes, setNotes] = useState<CapNote[]>(initialNotes);
  const [context, setContext] = useState("");
  const [action, setAction] = useState("");
  const [plan, setPlan] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const canSave =
    context.trim().length > 0 &&
    action.trim().length > 0 &&
    plan.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const note: CapNote = {
      id: `cap-local-${Date.now()}`,
      date: new Date().toISOString(),
      coach: authorName,
      context: context.trim(),
      action: action.trim(),
      plan: plan.trim(),
    };
    setNotes((prev) => [note, ...prev]);
    setContext("");
    setAction("");
    setPlan("");
    setFlash(`CAP note logged for ${athleteFirstName}.`);
    window.setTimeout(() => setFlash(null), 3200);
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h3 className="text-base">CAP notes</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {notes.length} on file · newest first
          </span>
        </div>

        {/* Inline composer */}
        <div className="flex flex-col gap-4 rounded-xl border border-brand/25 bg-brand/[0.05] p-4">
          <div>
            <span className="eyebrow">Add a note</span>
            <p className="text-sm text-muted-foreground">
              Context · Action · Plan — the shared language of every session.
            </p>
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
            <Button variant="brand" size="sm" onClick={handleSave} disabled={!canSave}>
              <Sparkles className="h-4 w-4" />
              Save CAP note
            </Button>
            {flash ? (
              <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                {flash}
              </Pill>
            ) : (
              <span className="text-xs text-muted-foreground">
                Saves locally to the feed below — demo, no data leaves this
                screen.
              </span>
            )}
          </div>
        </div>

        {/* Feed */}
        {notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
            No CAP note yet — log the first one above.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <CapCard key={note.id} note={note} />
            ))}
          </div>
        )}
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
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="resize-none bg-card"
      />
    </div>
  );
}

function CapCard({ note }: { note: CapNote }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold">{note.coach}</span>
        <span className="text-xs text-muted-foreground">
          {relTime(note.date)}
        </span>
      </div>
      <dl className="flex flex-col gap-2.5 text-sm">
        <CapLine label="C" text={note.context} />
        <CapLine label="A" text={note.action} />
        <CapLine label="P" text={note.plan} />
      </dl>
    </div>
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
