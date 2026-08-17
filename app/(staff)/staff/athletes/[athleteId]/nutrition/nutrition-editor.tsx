"use client";

import { useEffect, useState } from "react";
import { History, Plus, Salad, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { fmtFullDay, type Athlete } from "@/lib/demo/data";
import { nutritionProtocols } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/**
 * Round 12 (N4/N5): the protocol editor formerly inside NutritionButton's
 * modal, now page-level — same fields, same save-appends-a-revision history
 * (same aos-nutrition-revisions-{athleteId} key), plus the tier control that
 * used to live in the header dropdown.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

const NUTRITION_LABEL: Record<Athlete["nutrition"], string> = {
  none: "Disabled",
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

export function NutritionEditor({
  athleteId,
  initialTier,
}: {
  athleteId: string;
  initialTier: Athlete["nutrition"];
}) {
  const [tier, setTier] = useState<Athlete["nutrition"]>(initialTier);
  // C13 — fields seed from the member's protocol.
  const seed = nutritionProtocols[athleteId];
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
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  /** R20 — swap the current fields to a previous snapshot. */
  function restoreRevision(rev: ProtocolRevision) {
    setSummary(rev.snapshot.summary);
    setMeals([...rev.snapshot.meals]);
    setSupplements([...rev.snapshot.supplements]);
    setNotes(rev.snapshot.notes);
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
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* The protocol itself — tier control up top, then the fields */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <Salad className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Protocol</h3>
            {/* N5 — the tier switch that used to be the header dropdown */}
            <select
              value={tier}
              aria-label="Nutrition tier"
              onChange={(e) => setTier(e.target.value as Athlete["nutrition"])}
              className="ml-auto h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
            >
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
              <option value="none">Disabled</option>
            </select>
          </div>

          {tier === "none" ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs font-medium text-warning">
              Nutrition is disabled — the member doesn&apos;t see this protocol
              in their portal. Pick Standard or Pro to re-enable it.
            </p>
          ) : null}

          {/* R20 — read-only preview banner while viewing a revision */}
          {viewing ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-info/40 bg-info/10 p-3 text-xs font-medium text-info">
              <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                Viewing the {fmtFullDay(viewing.date)} version ({viewing.coach})
                — read-only preview.
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
                  onChange={(e) => setLine(setSupplements, i, e.target.value)}
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

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">
              Tier: {NUTRITION_LABEL[tier]}. Saves locally in this demo.
            </span>
            <span className="ml-auto flex items-center gap-2">
              {savedFlash ? (
                <Pill tone="success" dot>
                  Saved
                </Pill>
              ) : null}
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
        </CardContent>
      </Card>

      {/* R20 — Revisions: every save on file, newest first */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h3 className="text-base">Revision History</h3>
          </div>
          {revisions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface/30 p-3 text-xs text-muted-foreground">
              No revisions yet — every save is recorded here with the date and
              coach.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {revisions.map((rev) => (
                <li
                  key={rev.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2",
                    viewing?.id === rev.id && "border-brand/50 bg-brand/[0.05]",
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
        </CardContent>
      </Card>
    </div>
  );
}
