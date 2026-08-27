"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, NotebookPen, Sparkles, Trash2 } from "lucide-react";

import { RichTextComposer, RichTextView } from "@/components/app/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { fmtDay, relTime, type MemberNote } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

/** Round 15 (W4): notes shown by default before the feed collapses behind "Show all". */
const RECENT_NOTES_COUNT = 4;

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
  const [showAll, setShowAll] = useState(false);
  // Round 18 (D6): deleting REPLACES the body with a tombstone — the note
  // stays in the list/history as the log of who deleted it and when.
  const [tombstones, setTombstones] = useState<
    Record<string, { by: string; at: string }>
  >({});
  // Two-step confirm: the first tap ARMS the trash for ~4s, the second deletes.
  const [armedId, setArmedId] = useState<string | null>(null);
  const armTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimer.current) window.clearTimeout(armTimer.current);
    },
    [],
  );

  function handleDelete(id: string) {
    if (armedId !== id) {
      setArmedId(id);
      if (armTimer.current) window.clearTimeout(armTimer.current);
      armTimer.current = window.setTimeout(() => setArmedId(null), 4000);
      return;
    }
    if (armTimer.current) window.clearTimeout(armTimer.current);
    setArmedId(null);
    setTombstones((prev) => ({
      ...prev,
      [id]: { by: authorName, at: new Date().toISOString() },
    }));
  }

  const canSave = draftHtml.trim().length > 0;
  const hasOverflow = notes.length > RECENT_NOTES_COUNT;
  const visibleNotes =
    showAll || !hasOverflow ? notes : notes.slice(0, RECENT_NOTES_COUNT);

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
            {/* Round 15 (W4): expanded history scrolls inside a capped area so the panel stays bounded */}
            <div
              className={
                showAll && hasOverflow
                  ? "flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1 scrollbar-slim"
                  : "flex flex-col gap-3"
              }
            >
              {visibleNotes.map((note) => {
                const tomb = tombstones[note.id];
                return (
                  <div
                    key={note.id}
                    className="rounded-lg border border-border bg-surface/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{note.coach}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {relTime(note.date)}
                        </span>
                        {/* D6 — two-step delete; deleted notes keep no action */}
                        {!tomb ? (
                          <button
                            type="button"
                            aria-label={
                              armedId === note.id
                                ? "Click again to confirm delete"
                                : "Delete note"
                            }
                            title={
                              armedId === note.id
                                ? "Click again to confirm"
                                : "Delete note"
                            }
                            onClick={() => handleDelete(note.id)}
                            className={cn(
                              "rounded p-1 transition-colors",
                              armedId === note.id
                                ? "text-destructive"
                                : "text-muted-foreground/70 hover:text-destructive",
                            )}
                          >
                            {armedId === note.id ? (
                              <span className="text-[0.68rem] font-semibold">
                                Delete?
                              </span>
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}
                      </span>
                    </div>
                    {tomb ? (
                      <p className="text-sm italic text-muted-foreground">
                        This note was deleted by {tomb.by} on {fmtDay(tomb.at)}.
                      </p>
                    ) : (
                      <RichTextView
                        html={note.body}
                        className="text-foreground/90"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {hasOverflow ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show fewer" : `Show all ${notes.length} notes`}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
