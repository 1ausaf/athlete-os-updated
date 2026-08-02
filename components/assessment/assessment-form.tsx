"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  EXT_ROTATION_MULTIPLIER,
  KLATT_COLUMNS,
  ROM_OPTIONS,
  TRAP3_MULTIPLIER,
  WARMUP_SCHEME,
  accessoryRamp,
  bestAchievedLoad,
  fiberTestLoad,
  fiberTypeFor,
  warmupLoads,
  type Assessment,
  type LrRow,
  type RomOption,
  type YnRow,
} from "@/lib/demo/assessment";
import type { Athlete } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

/**
 * The Remapping Assessment as one shared component: coaches get `mode="edit"`
 * (toggles, dropdowns, auto-calculating ladders), athletes get `mode="view"`
 * of the exact same layout — the two can never drift apart.
 */
export function AssessmentForm({
  initial,
  athlete,
  mode,
  onSaved,
}: {
  initial: Assessment;
  athlete: Athlete;
  mode: "edit" | "view";
  onSaved?: () => void;
}) {
  const [a, setA] = useState<Assessment>(initial);
  const [savedFlash, setSavedFlash] = useState(false);
  const edit = mode === "edit";

  const patch = (updater: (draft: Assessment) => Assessment) => {
    if (!edit) return;
    setA((prev) => updater(structuredClone(prev)));
  };

  const benchLoads = warmupLoads(a.bench.est1Rm);
  const scottLoads = warmupLoads(a.scott.est1Rm);
  const benchBest = bestAchievedLoad(a.bench);
  const testLoad = fiberTestLoad(a.bench);
  const fiberType = fiberTypeFor(a.fiberTest.reps);
  const trap3Warmup = useMemo(
    () => accessoryRamp(benchBest, TRAP3_MULTIPLIER),
    [benchBest],
  );
  const extRotWarmup = useMemo(
    () => accessoryRamp(benchBest, EXT_ROTATION_MULTIPLIER),
    [benchBest],
  );

  function handleSave() {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 3000);
    onSaved?.();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Intake header */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <HeaderField label="Name" value={athlete.name} />
          <HeaderField label="Sex" value={athlete.gender} />
          <HeaderNumber
            label="Height (cm)"
            value={a.header.heightCm}
            edit={edit}
            onChange={(v) => patch((d) => ((d.header.heightCm = v), d))}
          />
          <HeaderNumber
            label="Weight (lb)"
            value={a.header.weightLb}
            edit={edit}
            onChange={(v) => patch((d) => ((d.header.weightLb = v), d))}
          />
          <HeaderNumber
            label="Body fat (%)"
            value={a.header.bodyFatPct}
            edit={edit}
            onChange={(v) => patch((d) => ((d.header.bodyFatPct = v), d))}
          />
        </CardContent>
      </Card>

      <SectionBanner>Lower Body & Movement</SectionBanner>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <BlockTitle>Flexibility</BlockTitle>
          <LrTable
            rows={a.flexibility.rows}
            edit={edit}
            onToggle={(i, side) =>
              patch((d) => {
                d.flexibility.rows[i]![side] = !d.flexibility.rows[i]![side];
                return d;
              })
            }
          />
          <NotesField
            value={a.flexibility.notes}
            edit={edit}
            onChange={(v) => patch((d) => ((d.flexibility.notes = v), d))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <BlockTitle>Klatt Test</BlockTitle>
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr>
                  <th className="pb-2 pr-2 text-left text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
                    Finding
                  </th>
                  {KLATT_COLUMNS.map((c) => (
                    <th
                      key={c}
                      className="tnum pb-2 text-center text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.klatt.rows.map((row, ri) => (
                  <tr key={row.finding} className="border-t border-border/60">
                    <td className="py-1.5 pr-2 font-medium">{row.finding}</td>
                    {row.marks.map((m, ci) => (
                      <td key={ci} className="py-1.5 text-center">
                        <MarkBox
                          checked={m}
                          edit={edit}
                          label={`${row.finding} ${KLATT_COLUMNS[ci]}`}
                          onToggle={() =>
                            patch((d) => {
                              d.klatt.rows[ri]!.marks[ci] =
                                !d.klatt.rows[ri]!.marks[ci];
                              return d;
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <NotesField
            value={a.klatt.notes}
            edit={edit}
            onChange={(v) => patch((d) => ((d.klatt.notes = v), d))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <BlockTitle>Rocker Board · Front / Back</BlockTitle>
            <LrTable
              rows={a.rockerBoard.frontBack}
              edit={edit}
              onToggle={(i, side) =>
                patch((d) => {
                  d.rockerBoard.frontBack[i]![side] =
                    !d.rockerBoard.frontBack[i]![side];
                  return d;
                })
              }
            />
          </div>
          <div className="flex flex-col gap-4">
            <BlockTitle>Rocker Board · Side-to-Side</BlockTitle>
            <LrTable
              rows={a.rockerBoard.sideToSide}
              edit={edit}
              onToggle={(i, side) =>
                patch((d) => {
                  d.rockerBoard.sideToSide[i]![side] =
                    !d.rockerBoard.sideToSide[i]![side];
                  return d;
                })
              }
            />
          </div>
          <div className="lg:col-span-2">
            <NotesField
              value={a.rockerBoard.notes}
              edit={edit}
              onChange={(v) => patch((d) => ((d.rockerBoard.notes = v), d))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <BlockTitle>Wobble Board</BlockTitle>
            <LrTable
              rows={a.wobbleSitfit.wobble}
              edit={edit}
              onToggle={(i, side) =>
                patch((d) => {
                  d.wobbleSitfit.wobble[i]![side] =
                    !d.wobbleSitfit.wobble[i]![side];
                  return d;
                })
              }
            />
          </div>
          <div className="flex flex-col gap-4">
            <BlockTitle>SitFit</BlockTitle>
            <LrTable
              rows={a.wobbleSitfit.sitfit}
              edit={edit}
              onToggle={(i, side) =>
                patch((d) => {
                  d.wobbleSitfit.sitfit[i]![side] =
                    !d.wobbleSitfit.sitfit[i]![side];
                  return d;
                })
              }
            />
          </div>
          <div className="lg:col-span-2">
            <NotesField
              value={a.wobbleSitfit.notes}
              edit={edit}
              onChange={(v) => patch((d) => ((d.wobbleSitfit.notes = v), d))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <BlockTitle>Overhead Squat</BlockTitle>
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {a.overheadSquat.rows.map((row, i) => (
              <YnLine
                key={row.name}
                row={row}
                edit={edit}
                onToggle={() =>
                  patch((d) => {
                    d.overheadSquat.rows[i]!.value =
                      !d.overheadSquat.rows[i]!.value;
                    return d;
                  })
                }
              />
            ))}
          </div>
          <NotesField
            value={a.overheadSquat.notes}
            edit={edit}
            onChange={(v) => patch((d) => ((d.overheadSquat.notes = v), d))}
          />
        </CardContent>
      </Card>

      <SectionBanner>Upper Body & Strength Ratios</SectionBanner>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <BlockTitle>Shoulder Girdle ROM & Posture</BlockTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RomSelect
              label="Internal rotation · L"
              value={a.shoulder.irL}
              edit={edit}
              onChange={(v) => patch((d) => ((d.shoulder.irL = v), d))}
            />
            <RomSelect
              label="Internal rotation · R"
              value={a.shoulder.irR}
              edit={edit}
              onChange={(v) => patch((d) => ((d.shoulder.irR = v), d))}
            />
            <RomSelect
              label="External rotation · L"
              value={a.shoulder.erL}
              edit={edit}
              onChange={(v) => patch((d) => ((d.shoulder.erL = v), d))}
            />
            <RomSelect
              label="External rotation · R"
              value={a.shoulder.erR}
              edit={edit}
              onChange={(v) => patch((d) => ((d.shoulder.erR = v), d))}
            />
          </div>
          <LrTable
            rows={a.shoulder.posture}
            edit={edit}
            onToggle={(i, side) =>
              patch((d) => {
                d.shoulder.posture[i]![side] = !d.shoulder.posture[i]![side];
                return d;
              })
            }
          />
          <NotesField
            value={a.shoulder.notes}
            edit={edit}
            onChange={(v) => patch((d) => ((d.shoulder.notes = v), d))}
          />
        </CardContent>
      </Card>

      {/* Strength ladders — the auto-calculating heart of the sheet */}
      <StrengthLadder
        title="8-Set Warm-up Loading — Bench Press (biacromial grip)"
        block={a.bench}
        loads={benchLoads}
        edit={edit}
        onEst={(v) =>
          patch((d) => {
            d.bench.est1Rm = v;
            d.bench.achievedSetIdx = null; // stale index clears with the ladder
            return d;
          })
        }
        onAchieved={(i) =>
          patch((d) => {
            d.bench.achievedSetIdx = d.bench.achievedSetIdx === i ? null : i;
            return d;
          })
        }
      />

      <StrengthLadder
        title="8-Set Warm-up Loading — Scott Curl (biacromial)"
        block={a.scott}
        loads={scottLoads}
        edit={edit}
        onEst={(v) =>
          patch((d) => {
            d.scott.est1Rm = v;
            d.scott.achievedSetIdx = null;
            return d;
          })
        }
        onAchieved={(i) =>
          patch((d) => {
            d.scott.achievedSetIdx = d.scott.achievedSetIdx === i ? null : i;
            return d;
          })
        }
      />

      {/* Muscle fiber type */}
      <Card className="border-brand/30">
        <CardContent className="flex flex-col gap-4 p-5">
          <BlockTitle>Muscle Fiber Type Test (rest 5–7 min)</BlockTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface/50 p-3">
              <span className="eyebrow">Best bench achieved</span>
              <p className="tnum mt-1 text-xl font-extrabold">
                {benchBest != null ? `${benchBest} lb` : "—"}
              </p>
              <p className="text-[0.7rem] text-muted-foreground">
                From the ladder above — not the estimate.
              </p>
            </div>
            <div className="rounded-lg border border-brand/30 bg-brand/[0.05] p-3">
              <span className="eyebrow">Test load · 85%</span>
              <p className="tnum mt-1 text-xl font-extrabold text-brand-ink">
                {testLoad != null ? `${testLoad} lb` : "—"}
              </p>
              <p className="text-[0.7rem] text-muted-foreground">
                Auto-computed. Max reps after full rest.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 p-3">
              <span className="eyebrow">Reps completed</span>
              {edit ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="tnum mt-1 h-9 w-24 font-bold"
                  value={a.fiberTest.reps ?? ""}
                  aria-label="Fiber test reps completed"
                  onChange={(e) =>
                    patch((d) => {
                      d.fiberTest.reps =
                        e.target.value === "" ? null : Number(e.target.value);
                      return d;
                    })
                  }
                />
              ) : (
                <p className="tnum mt-1 text-xl font-extrabold">
                  {a.fiberTest.reps ?? "—"}
                </p>
              )}
              {fiberType ? (
                <Pill tone="brand" className="mt-1.5">
                  {fiberType}
                </Pill>
              ) : null}
            </div>
          </div>
          <NotesField
            value={a.fiberTest.notes}
            edit={edit}
            onChange={(v) => patch((d) => ((d.fiberTest.notes = v), d))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <AccessoryCard
          title="Bent Over Trap 3"
          warmup={trap3Warmup}
          block={a.trap3}
          edit={edit}
          onChange={(side, v) =>
            patch((d) => {
              d.trap3[side] = v;
              return d;
            })
          }
        />
        <AccessoryCard
          title="External Rotation — Arm in Front"
          warmup={extRotWarmup}
          block={a.extRotation}
          edit={edit}
          onChange={(side, v) =>
            patch((d) => {
              d.extRotation[side] = v;
              return d;
            })
          }
        />
      </div>

      <SectionBanner>Performance</SectionBanner>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {a.performance.rows.map((row, i) => {
              const skipped = row.kidsOnly && !athlete.isMinor;
              return (
                <div
                  key={row.name}
                  className={cn(
                    "rounded-lg border border-border bg-surface/50 p-3",
                    skipped && "opacity-50",
                  )}
                >
                  <span className="eyebrow">
                    {row.name}
                    {row.kidsOnly ? " (kids only)" : ""}
                  </span>
                  {edit && !skipped ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="tnum mt-1 h-9 w-28 font-bold"
                      value={row.value ?? ""}
                      aria-label={`${row.name} (${row.unit})`}
                      onChange={(e) =>
                        patch((d) => {
                          d.performance.rows[i]!.value =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          return d;
                        })
                      }
                    />
                  ) : (
                    <p className="tnum mt-1 text-xl font-extrabold">
                      {skipped ? "—" : (row.value ?? "—")}
                      {!skipped && row.value != null ? (
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          {row.unit}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <NotesField
            value={a.performance.notes}
            edit={edit}
            onChange={(v) => patch((d) => ((d.performance.notes = v), d))}
          />
        </CardContent>
      </Card>

      {/* Round 7: areas of concern are discussed in person — the record just
          keeps a free-text notes box. */}
      <SectionBanner>Other Notes</SectionBanner>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          {edit ? (
            <textarea
              value={a.otherNotes}
              rows={4}
              placeholder="Anything else worth keeping with this assessment…"
              aria-label="Other notes"
              className="w-full resize-y rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-brand/50"
              onChange={(e) =>
                patch((d) => {
                  d.otherNotes = e.target.value;
                  return d;
                })
              }
            />
          ) : (
            <p className="text-sm text-pretty">
              {a.otherNotes || <span className="text-muted-foreground">—</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {edit ? (
        <div className="sticky bottom-4 z-30 flex items-center gap-3 self-center rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-raised backdrop-blur">
          {savedFlash ? (
            <Pill tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
              Assessment saved
            </Pill>
          ) : (
            <span className="text-xs text-muted-foreground">
              Everything on this page saves to {athlete.name.split(" ")[0]}&apos;s
              record.
            </span>
          )}
          <Button variant="brand" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save assessment
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function SectionBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-brand px-4 py-2 font-display text-sm font-extrabold uppercase tracking-wider text-brand-foreground">
      {children}
    </div>
  );
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base">{children}</h3>;
}

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function HeaderNumber({
  label,
  value,
  edit,
  onChange,
}: {
  label: string;
  value: number | null;
  edit: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      {edit ? (
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          className="tnum mt-1 h-8 w-24 text-sm font-semibold"
          value={value ?? ""}
          aria-label={label}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      ) : (
        <p className="tnum mt-1 text-sm font-semibold">{value ?? "—"}</p>
      )}
    </div>
  );
}

function MarkBox({
  checked,
  edit,
  label,
  onToggle,
}: {
  checked: boolean;
  edit: boolean;
  label: string;
  onToggle: () => void;
}) {
  if (!edit) {
    return checked ? (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-brand/15 text-brand-ink">
        <Check className="h-3 w-3" aria-label={`${label}: marked`} />
      </span>
    ) : (
      <span
        className="inline-block h-5 w-5 rounded border border-border/70 bg-surface/40"
        aria-label={`${label}: clear`}
      />
    );
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors",
        checked
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-surface/60 hover:border-brand/50",
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : null}
    </button>
  );
}

function LrTable({
  rows,
  edit,
  onToggle,
}: {
  rows: LrRow[];
  edit: boolean;
  onToggle: (index: number, side: "left" | "right") => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] items-center gap-x-2 pb-1 text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
        <span />
        <span className="text-center">L</span>
        <span className="text-center">R</span>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.name}
          className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem] items-center gap-x-2 border-t border-border/60 py-1.5"
        >
          <span className="text-sm font-medium">{row.name}</span>
          <span className="text-center">
            <MarkBox
              checked={row.left}
              edit={edit}
              label={`${row.name} — left`}
              onToggle={() => onToggle(i, "left")}
            />
          </span>
          <span className="text-center">
            <MarkBox
              checked={row.right}
              edit={edit}
              label={`${row.name} — right`}
              onToggle={() => onToggle(i, "right")}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function YnLine({
  row,
  edit,
  onToggle,
}: {
  row: YnRow;
  edit: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border/60 py-1.5">
      <span className="text-sm font-medium">{row.name}</span>
      <MarkBox
        checked={row.value}
        edit={edit}
        label={row.name}
        onToggle={onToggle}
      />
    </div>
  );
}

function NotesField({
  value,
  edit,
  onChange,
}: {
  value: string;
  edit: boolean;
  onChange: (v: string) => void;
}) {
  if (!edit) {
    if (!value) return null;
    return (
      <p className="rounded-lg border border-border bg-surface/40 p-3 text-sm text-foreground/90">
        <span className="mr-1.5 font-semibold text-muted-foreground">
          Notes:
        </span>
        {value}
      </p>
    );
  }
  return (
    <Textarea
      rows={2}
      value={value}
      placeholder="Notes for this section…"
      aria-label="Section notes"
      className="resize-none bg-surface/50 text-sm"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function RomSelect({
  label,
  value,
  edit,
  onChange,
}: {
  label: string;
  value: RomOption | null;
  edit: boolean;
  onChange: (v: RomOption) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3">
      <span className="eyebrow">{label}</span>
      {edit ? (
        <select
          value={value ?? ""}
          aria-label={label}
          onChange={(e) => onChange(e.target.value as RomOption)}
          className="tnum mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm font-semibold"
        >
          <option value="" disabled>
            Select…
          </option>
          {ROM_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <p className="tnum mt-1 text-sm font-semibold">{value ?? "—"}</p>
      )}
    </div>
  );
}

function StrengthLadder({
  title,
  block,
  loads,
  edit,
  onEst,
  onAchieved,
}: {
  title: string;
  block: { est1Rm: number | null; achievedSetIdx: number | null };
  loads: (number | null)[];
  edit: boolean;
  onEst: (v: number | null) => void;
  onAchieved: (idx: number) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BlockTitle>{title}</BlockTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estimated 1RM
            </span>
            {edit ? (
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                className="tnum h-9 w-24 font-bold"
                value={block.est1Rm ?? ""}
                aria-label={`${title} — estimated 1RM (lb)`}
                onChange={(e) =>
                  onEst(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            ) : (
              <span className="tnum text-lg font-extrabold">
                {block.est1Rm != null ? `${block.est1Rm} lb` : "—"}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-slim">
          <div className="grid min-w-[560px] grid-cols-9 gap-1.5">
            {WARMUP_SCHEME.map((slot, i) => {
              const load = loads[i];
              const achieved = block.achievedSetIdx === i;
              const enabled = edit && load != null;
              return (
                <button
                  key={slot.label}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={achieved}
                  aria-label={`${slot.label} — ${load != null ? `${load} lb` : "no load"}${achieved ? " (best set achieved)" : ""}`}
                  title={
                    edit
                      ? "Tick the heaviest set completed"
                      : achieved
                        ? "Best set achieved"
                        : undefined
                  }
                  onClick={() => onAchieved(i)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center transition-colors",
                    achieved
                      ? "border-brand bg-brand/10"
                      : "border-border bg-surface/50",
                    enabled && !achieved && "hover:border-brand/50",
                    !edit && "cursor-default",
                  )}
                >
                  <span className="text-[0.58rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {slot.label}
                  </span>
                  <span
                    className={cn(
                      "tnum text-base font-extrabold",
                      achieved && "text-brand-ink",
                    )}
                  >
                    {load ?? "—"}
                  </span>
                  <span className="tnum text-[0.6rem] text-muted-foreground">
                    {slot.pct}%
                  </span>
                  {achieved ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[0.6rem] font-bold text-brand-ink">
                      <Check className="h-3 w-3" /> Achieved
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the estimate and the ladder computes itself — then tick the
          heaviest set actually completed. Downstream loads use the achieved
          set, not the estimate.
        </p>
      </CardContent>
    </Card>
  );
}

function AccessoryCard({
  title,
  warmup,
  block,
  edit,
  onChange,
}: {
  title: string;
  warmup: (number | null)[];
  block: { test8RmL: number | null; test8RmR: number | null };
  edit: boolean;
  onChange: (side: "test8RmL" | "test8RmR", v: number | null) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <BlockTitle>{title}</BlockTitle>
        <div>
          <span className="eyebrow">Warm-up · 3RM L&R · 120s</span>
          <div className="mt-1.5 flex gap-1.5">
            {warmup.map((w, i) => (
              <span
                key={i}
                className="tnum flex-1 rounded-lg border border-border bg-surface/50 px-2 py-1.5 text-center text-sm font-bold"
              >
                {w != null ? `${w} lb` : "—"}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[0.7rem] text-muted-foreground">
            Auto-derived from the best bench set achieved.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["test8RmL", "Test · 8RM · Left"],
              ["test8RmR", "Test · 8RM · Right"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="rounded-lg border border-border bg-surface/50 p-3"
            >
              <span className="eyebrow">{label}</span>
              {edit ? (
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  className="tnum mt-1 h-9 w-24 font-bold"
                  value={block[key] ?? ""}
                  aria-label={`${title} — ${label} (lb)`}
                  onChange={(e) =>
                    onChange(
                      key,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              ) : (
                <p className="tnum mt-1 text-xl font-extrabold">
                  {block[key] != null ? `${block[key]} lb` : "—"}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
