"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

/**
 * Round 10 (R23) — the GROUP assessment: one table, rows = linked member
 * athletes, columns = the combine metrics. Blank cells are allowed on
 * purpose — too young, too old, or the test isn't sport-relevant.
 * Persists per group in localStorage.
 */

const FIELD_LABEL =
  "text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground";

const METRICS = [
  { key: "vert", label: "Vertical Jump", unit: "in" },
  { key: "broad", label: "Broad Jump", unit: "in" },
  { key: "ten", label: "10-Yard", unit: "s" },
  { key: "agility", label: "5-10-5 Pro Agility", unit: "s" },
  { key: "forty", label: "40-Yard", unit: "s" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

/** athleteId → metric → entered value ("" = not tested). */
type GridValues = Record<string, Partial<Record<MetricKey, string>>>;

interface StoredAssessment {
  date: string;
  values: GridValues;
}

export interface GroupAssessmentMember {
  id: string;
  name: string;
  initials: string;
  hue: number;
  age: number;
  sport: string;
}

export function GroupAssessmentTable({
  groupId,
  members,
}: {
  groupId: string;
  members: GroupAssessmentMember[];
}) {
  const storageKey = `aos-group-assessment-${groupId}`;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState<GridValues>({});
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAssessment;
        if (parsed && typeof parsed === "object") {
          if (parsed.date) setDate(parsed.date);
          if (parsed.values) setValues(parsed.values);
        }
      }
    } catch {
      /* corrupted storage — start blank */
    }
  }, [storageKey]);

  function setCell(athleteId: string, metric: MetricKey, v: string) {
    setValues((prev) => ({
      ...prev,
      [athleteId]: { ...prev[athleteId], [metric]: v },
    }));
  }

  function handleSave() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ date, values } satisfies StoredAssessment),
      );
    } catch {
      /* storage full/blocked — results still live in-memory */
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>Testing day</span>
            <input
              type="date"
              value={date}
              aria-label="Testing day"
              onChange={(e) => setDate(e.target.value)}
              className="tnum h-9 rounded-md border border-input bg-surface px-2.5 text-sm font-medium"
            />
          </label>
          <span className="ml-auto flex items-center gap-2">
            {savedFlash ? (
              <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                Saved
              </Pill>
            ) : null}
            <Button variant="brand" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border scrollbar-slim">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Member
                </th>
                {METRICS.map((m) => (
                  <th
                    key={m.key}
                    className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {m.label}{" "}
                    <span className="font-medium normal-case">({m.unit})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <AthleteAvatar
                        initials={a.initials}
                        hue={a.hue}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold">{a.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {a.sport} · {a.age}
                        </span>
                      </span>
                    </span>
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.key} className="px-3 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={values[a.id]?.[m.key] ?? ""}
                        placeholder="—"
                        aria-label={`${a.name} — ${m.label} (${m.unit})`}
                        onChange={(e) => setCell(a.id, m.key, e.target.value)}
                        className="tnum h-8 w-20 rounded-md border border-input bg-surface px-2 text-right text-sm font-medium placeholder:text-muted-foreground/60"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={METRICS.length + 1}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    No linked member profiles yet — link profiles from the
                    group page to run a group assessment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-pretty">
          Leave blank when a test isn&apos;t run — too young, too old, or not
          sport-relevant. Saves locally in this demo.
        </p>
      </CardContent>
    </Card>
  );
}
