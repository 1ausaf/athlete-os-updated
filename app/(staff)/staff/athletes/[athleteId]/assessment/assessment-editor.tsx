"use client";

import { useState } from "react";
import { ClipboardCheck, PenLine } from "lucide-react";

import { AssessmentForm } from "@/components/assessment/assessment-form";
import { Button } from "@/components/ui/button";
import type { Assessment } from "@/lib/demo/assessment";
import type { Athlete } from "@/lib/demo/data";

/**
 * Coach-side wrapper: an existing assessment opens read-only with an Edit
 * switch; a blank one starts behind a "Start assessment" call-to-action and
 * goes straight into edit mode (check-on/check-off during testing).
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
  const [mode, setMode] = useState<"view" | "edit">(
    hasExisting ? "view" : "edit",
  );
  const [started, setStarted] = useState(hasExisting);

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
            you test — the strength ladders compute themselves.
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
      {hasExisting ? (
        <div className="flex items-center justify-end">
          <Button
            variant={mode === "edit" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setMode((m) => (m === "edit" ? "view" : "edit"))}
          >
            <PenLine className="h-4 w-4" />
            {mode === "edit" ? "Done editing" : "Edit assessment"}
          </Button>
        </div>
      ) : null}
      <AssessmentForm
        key={mode}
        initial={initial}
        athlete={athlete}
        mode={mode}
        onSaved={() => setMode("view")}
      />
    </div>
  );
}
