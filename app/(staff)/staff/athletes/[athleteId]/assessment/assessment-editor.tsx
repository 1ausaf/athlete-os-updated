"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

import { AssessmentForm } from "@/components/assessment/assessment-form";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import type { Assessment } from "@/lib/demo/assessment";
import type { Athlete } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

/**
 * Round 8 (C14): the Remapping editor is ALWAYS editable — every field change
 * auto-saves (the "Auto-saved ✓" chip flashes on each patch) and the one
 * button at the very bottom completes the assessment ("Update Assessment" on
 * later visits). The form's internal Save bar is hidden — this wrapper's
 * sticky bar replaces it.
 */
export function AssessmentEditor({
  initial,
  athlete,
  hasExisting,
}: {
  initial: Assessment;
  athlete: Athlete;
  hasExisting: boolean;
}) {
  const [started, setStarted] = useState(hasExisting);
  const [completed, setCompleted] = useState(hasExisting);
  const [autoFlash, setAutoFlash] = useState(false);
  const [doneFlash, setDoneFlash] = useState(false);
  const autoTimer = useRef<number | null>(null);
  const doneTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
      if (doneTimer.current) window.clearTimeout(doneTimer.current);
    },
    [],
  );

  /** C14 — each field change flashes the always-on auto-save indicator. */
  function bumpAutosave() {
    setAutoFlash(true);
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(() => setAutoFlash(false), 1400);
  }

  function handleComplete() {
    setCompleted(true);
    setDoneFlash(true);
    if (doneTimer.current) window.clearTimeout(doneTimer.current);
    doneTimer.current = window.setTimeout(() => setDoneFlash(false), 3000);
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-surface/30 p-10 text-center">
        <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-semibold">
            {athlete.name} hasn&apos;t been assessed yet.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
            Run the Remapping Assessment on the floor and check things off as
            you test — every entry auto-saves and the strength ladders compute
            themselves.
          </p>
        </div>
        <Button variant="brand" onClick={() => setStarted(true)}>
          <ClipboardCheck className="h-4 w-4" />
          Start Remapping Assessment
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Always editable (C14). The wrapper captures every keystroke and
          toggle to flash "Auto-saved"; completion happens in the bar below,
          so the form's own save bar stays off via hideSaveBar. */}
      <div
        onInputCapture={bumpAutosave}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("button")) bumpAutosave();
        }}
      >
        <AssessmentForm
          initial={initial}
          athlete={athlete}
          mode="edit"
          hideSaveBar
        />
      </div>

      {/* C14 — the ONE action, pinned at the very bottom */}
      <div className="sticky bottom-4 z-30 flex items-center gap-3 self-center rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-raised backdrop-blur">
        {doneFlash ? (
          <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            Assessment saved to {athlete.name.split(" ")[0]}&apos;s record
          </Pill>
        ) : (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              autoFlash
                ? "font-semibold text-success"
                : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Auto-saved ✓
          </span>
        )}
        <Button variant="brand" size="sm" onClick={handleComplete}>
          <ClipboardCheck className="h-4 w-4" />
          {completed ? "Update Assessment" : "Complete Assessment"}
        </Button>
      </div>
    </div>
  );
}
