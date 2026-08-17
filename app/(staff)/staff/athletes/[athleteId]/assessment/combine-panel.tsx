"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import type { CombineResult } from "@/lib/demo/assessment";

/**
 * Round 5 (C37): combine-testing day editor — the second assessment TYPE.
 * Coaches key results in during testing; deltas vs the previous test render
 * automatically. ("Think of this as a way to create combines.")
 */
export function CombinePanel({
  initialResults,
  initialNotes,
  editable,
}: {
  initialResults: CombineResult[];
  initialNotes: string;
  editable: boolean;
}) {
  const [results, setResults] = useState(initialResults);
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);

  function setValue(i: number, v: number | null) {
    setResults((prev) => prev.map((r, j) => (j === i ? { ...r, value: v } : r)));
  }

  // Time-based metrics improve DOWNWARD.
  function delta(r: CombineResult): { text: string; better: boolean } | null {
    if (r.value == null || r.previous == null) return null;
    const diff = r.value - r.previous;
    if (diff === 0) return { text: "±0", better: true };
    const lowerBetter = r.unit === "s";
    const better = lowerBetter ? diff < 0 : diff > 0;
    const sign = diff > 0 ? "+" : "−";
    return { text: `${sign}${Math.abs(Math.round(diff * 100) / 100)} ${r.unit}`, better };
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Test</th>
                <th className="px-3 py-2 text-right font-medium">Result</th>
                <th className="px-3 py-2 text-right font-medium">Previous</th>
                <th className="px-3 py-2 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const d = delta(r);
                return (
                  <tr key={r.metric} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{r.metric}</td>
                    <td className="px-3 py-2 text-right">
                      {editable ? (
                        <span className="inline-flex items-center gap-1.5">
                          <ResultField
                            value={r.value}
                            unit={r.unit}
                            ariaLabel={`${r.metric} result`}
                            onCommit={(v) => setValue(i, v)}
                          />
                          <span className="text-xs text-muted-foreground">{r.unit}</span>
                        </span>
                      ) : (
                        <span className="tnum font-semibold">
                          {r.value ?? "—"}{" "}
                          <span className="font-normal text-muted-foreground">{r.unit}</span>
                        </span>
                      )}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-muted-foreground">
                      {r.previous != null ? `${r.previous} ${r.unit}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {d ? (
                        <Pill tone={d.better ? "success" : "warning"}>{d.text}</Pill>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          {editable ? (
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Testing conditions, standout results, what to retest…"
              className="text-sm"
            />
          ) : (
            <p className="text-sm text-muted-foreground text-pretty">{notes || "—"}</p>
          )}
        </div>

        {editable ? (
          <div className="flex items-center gap-3">
            <Button variant="brand" size="sm" onClick={() => {
              setSaved(true);
              window.setTimeout(() => setSaved(false), 3000);
            }}>
              <Save className="h-4 w-4" />
              Save results
            </Button>
            {saved ? (
              <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                Saved
              </Pill>
            ) : (
              <span className="text-xs text-muted-foreground">
                Saves locally in this demo.
              </span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Round 12 (N8): local string draft — partial input never round-trips through
 * the model, so the first keystroke always lands. Commits only finite parses
 * (empty → null); the draft resyncs if the model moves underneath.
 */
function ResultField({
  value,
  unit,
  ariaLabel,
  onCommit,
}: {
  value: number | null;
  unit: string;
  ariaLabel: string;
  onCommit: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    const parsed = draft.trim() === "" ? NaN : Number(draft);
    const committed = Number.isFinite(parsed) ? parsed : null;
    if (committed !== value) setDraft(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="number"
      inputMode={unit === "reps" ? "numeric" : "decimal"}
      // Times keep hundredths, jumps half-inches, rep counts whole numbers.
      step={unit === "s" ? "0.01" : unit === "reps" ? "1" : "0.5"}
      min={0}
      value={draft}
      aria-label={ariaLabel}
      className="tnum h-8 w-20 text-right"
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === "") {
          onCommit(null);
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) onCommit(n);
      }}
    />
  );
}
