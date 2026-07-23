"use client";

import { useState } from "react";
import { CheckCircle2, NotebookPen, Sparkles } from "lucide-react";

import { RichTextComposer, RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { relTime, type MemberNote } from "@/lib/demo/data";

/**
 * The centerpiece of the athlete profile: this athlete's full note feed plus
 * an inline composer. Notes are free-form comments (Trello-style) — the
 * composer grows with the note and supports basic formatting.
 */
export function NotesPanel({
  athleteFirstName,
  authorName,
  initialNotes,
}: {
  athleteFirstName: string;
  authorName: string;
  initialNotes: MemberNote[];
}) {
  const [notes, setNotes] = useState<MemberNote[]>(initialNotes);
  const [draftHtml, setDraftHtml] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const canSave = draftHtml.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const note: MemberNote = {
      id: `note-local-${Date.now()}`,
      date: new Date().toISOString(),
      coach: authorName,
      body: draftHtml,
    };
    setNotes((prev) => [note, ...prev]);
    setDraftHtml("");
    setResetKey((k) => k + 1);
    setFlash(`Note logged for ${athleteFirstName}.`);
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

        {/* Composer — expands as you write, Trello-style */}
        <div className="flex flex-col gap-3">
          <RichTextComposer
            placeholder={`Write a note about ${athleteFirstName}…`}
            onChangeHtml={setDraftHtml}
            resetKey={resetKey}
            actions={
              <>
                {flash ? (
                  <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
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

        {/* Feed */}
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
