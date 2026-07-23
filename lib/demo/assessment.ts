/**
 * LPS Remapping™ Assessment — a faithful digitization of the client's real
 * spreadsheet (Assessment sheet): flexibility / Klatt / rocker board / wobble
 * & SitFit / overhead squat / shoulder girdle / strength ratios / performance,
 * with the auto-calculating warm-up ladders the client demoed live.
 *
 * One deliberate improvement over the sheet (client called it out on video):
 * the muscle-fiber test load and the accessory ramps derive from the BEST SET
 * ACTUALLY ACHIEVED, not the estimated 1RM.
 */

import { at } from "@/lib/demo/data";

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

export interface LrRow {
  name: string;
  left: boolean;
  right: boolean;
}

export interface KlattRow {
  finding: string;
  /** 8 marks: L-1, R-1, L-2, R-2, L-3, R-3, L-4, R-4. */
  marks: boolean[];
}

export interface YnRow {
  name: string;
  value: boolean;
}

export type RomOption = "<0°" | "0–45°" | "45–90°" | ">90°";
export const ROM_OPTIONS: RomOption[] = ["<0°", "0–45°", "45–90°", ">90°"];

/* ------------------------------------------------------------------ */
/* Strength blocks + calculators                                       */
/* ------------------------------------------------------------------ */

export interface WarmupSlot {
  label: string;
  pct: number;
}

/**
 * The sheet's 9-slot warm-up loading parameter. Verified against the client's
 * live demo: est 150 → 60, 75, 90, 113, 120, 128, 135, 143, 150.
 */
export const WARMUP_SCHEME: WarmupSlot[] = [
  { label: "S1 · 4RM · 10s", pct: 40 },
  { label: "S2 · 4RM · 10s", pct: 50 },
  { label: "S3 · 4RM · 30s", pct: 60 },
  { label: "S4 · 2RM · 60s", pct: 75 },
  { label: "S5 · 1RM · 120s", pct: 80 },
  { label: "S6 · 1 · 180s", pct: 85 },
  { label: "S7 · 1 · 240s", pct: 90 },
  { label: "S8 · 1 · 240s", pct: 95 },
  { label: "S9 · 1 · 200s", pct: 100 },
];

/** Whole-lb loads for every slot (113 = 75% of 150, exactly as his sheet). */
export function warmupLoads(est1Rm: number | null): (number | null)[] {
  if (est1Rm == null || est1Rm <= 0) {
    return WARMUP_SCHEME.map(() => null);
  }
  return WARMUP_SCHEME.map((s) => Math.round((est1Rm * s.pct) / 100));
}

export interface StrengthBlock {
  /** Coach's estimate going in — the ladder auto-computes from this. */
  est1Rm: number | null;
  /** Index (0-based) of the heaviest slot the athlete actually completed. */
  achievedSetIdx: number | null;
}

/** The load of the best completed set — the anchor for everything derived. */
export function bestAchievedLoad(block: StrengthBlock): number | null {
  if (block.achievedSetIdx == null) return null;
  const loads = warmupLoads(block.est1Rm);
  return loads[block.achievedSetIdx] ?? null;
}

/**
 * Muscle-fiber test load = 85% of the best BENCH set achieved (sheet showed
 * 143 → 121.55). Derived from achieved, not estimated — the deliberate fix.
 */
export function fiberTestLoad(bench: StrengthBlock): number | null {
  const best = bestAchievedLoad(bench);
  if (best == null) return null;
  return Math.round(best * 0.85 * 100) / 100;
}

/** Reps at 85% after 5–7 min rest → dominant fiber type. */
export function fiberTypeFor(reps: number | null): string | null {
  if (reps == null) return null;
  if (reps <= 4) return "Fast-twitch dominant";
  if (reps <= 10) return "Mixed fiber type";
  return "Slow-twitch dominant";
}

/**
 * Accessory ramps (Bent Over Trap 3 / External Rotation) — small percentages
 * of the bench anchor, ramped 50% → 75% → 100% (sheet: 150 → 7.6/11.4/15.2
 * for Trap 3 at 10.1%, 7.4/11.0/14.7 for external rotation at 9.8%).
 */
export function accessoryRamp(
  benchAnchor: number | null,
  multiplier: number,
): (number | null)[] {
  if (benchAnchor == null || benchAnchor <= 0) return [null, null, null];
  const top = benchAnchor * multiplier;
  return [0.5, 0.75, 1].map((f) => Math.round(top * f * 10) / 10);
}

export const TRAP3_MULTIPLIER = 0.101;
export const EXT_ROTATION_MULTIPLIER = 0.098;

export interface AccessoryBlock {
  /** Tested 8RM, left & right (the warm-up ramp is auto-derived). */
  test8RmL: number | null;
  test8RmR: number | null;
}

/* ------------------------------------------------------------------ */
/* The assessment record                                               */
/* ------------------------------------------------------------------ */

export interface PerformanceRow {
  name: string;
  unit: string;
  value: number | null;
  /** "Kids Only" rows stay blank for adults. */
  kidsOnly?: boolean;
}

export interface ResultRow {
  category: string;
  summary: string;
}

export interface Assessment {
  id: string;
  athleteId: string;
  assessedBy: string;
  date: string;
  status: "draft" | "complete";
  header: {
    heightCm: number | null;
    weightLb: number | null;
    bodyFatPct: number | null;
  };
  flexibility: { rows: LrRow[]; notes: string };
  klatt: { rows: KlattRow[]; notes: string };
  rockerBoard: { frontBack: LrRow[]; sideToSide: LrRow[]; notes: string };
  wobbleSitfit: { wobble: LrRow[]; sitfit: LrRow[]; notes: string };
  overheadSquat: { rows: YnRow[]; notes: string };
  shoulder: {
    irL: RomOption | null;
    irR: RomOption | null;
    erL: RomOption | null;
    erR: RomOption | null;
    posture: LrRow[];
    notes: string;
  };
  bench: StrengthBlock;
  scott: StrengthBlock;
  fiberTest: { reps: number | null; notes: string };
  trap3: AccessoryBlock;
  extRotation: AccessoryBlock;
  performance: { rows: PerformanceRow[]; notes: string };
  results: ResultRow[];
}

/* ------------------------------------------------------------------ */
/* Row templates (verbatim from the sheet)                             */
/* ------------------------------------------------------------------ */

const lr = (name: string, left = false, right = false): LrRow => ({
  name,
  left,
  right,
});
const yn = (name: string, value = false): YnRow => ({ name, value });

export const KLATT_COLUMNS = [
  "L-1",
  "R-1",
  "L-2",
  "R-2",
  "L-3",
  "R-3",
  "L-4",
  "R-4",
];

const FLEXIBILITY_ROWS = [
  "Sagittal Hamstring",
  "Medial Hamstring",
  "Lateral Hamstring",
  "Piriformis",
  "Lying Quad",
  "Rectus Femoris",
  "Psoas",
  "TFL",
];

const KLATT_FINDINGS = [
  "Knee In",
  "Hops Forward",
  "Hops 45 In",
  "Hops 45 Out",
  "Heel In",
  "Heel Out",
  "Bends Forward at Waist",
  "Bends Sideways at Waist",
];

const ROCKER_FRONT_BACK = [
  "Hip Back in 1st 15",
  "Knees Out at 45",
  "Knees Gradually Widen Out",
  "Knees Buckle In and Out at 90",
  "Knees Buckle in Gradually",
  "Heels Turn Out",
  "Rounds Back",
  "Hips Tuck Under at 90",
  "Heels Dig in When in Trouble",
  "Toes Dig in When in Trouble",
  "Bends at Waist Laterally",
];

const ROCKER_SIDE_TO_SIDE = [
  "Knees Buckle",
  "Shaking",
  "R Side Down",
  "L Side Down",
  "1 Leg in Front",
  "Heels Turn In",
  "Bends Laterally at Hip",
];

const WOBBLE_ROWS = [
  "Knees Buckle",
  "Foot Turns In",
  "Foot Turns Out",
  "Push Heels Down",
  "Push Toes Down",
  "Bends Laterally at Waist",
  "Shin Won't Go Forward",
  "Knee In at 90",
];

const SITFIT_ROWS = [
  "Knees Buckle",
  "Foot Pronates",
  "Foot Supinates",
  "Toes Down",
  "Heel Down",
  "Bends Laterally at Waist",
  "Shin Won't Go Forward",
  "Knee Buckles at 90",
];

const OVERHEAD_SQUAT_ROWS = [
  "Heels Come Up",
  "Feet Pronate / Ext. Rotate",
  "Knees Buckle Inward",
  "Low Back Arches",
  "Low Back Rounds",
  "Arms Fall Forward",
  "Dowel Can't Hit Wall",
  "Cervical Spine Hyperextends",
  "Can't Squat Below 90",
];

const SHOULDER_POSTURE_ROWS = [
  "Shoulder Elevated",
  "Shoulder Depressed",
  "Shoulder Impinged",
  "Scapular Protracted",
  "Scapular Wing",
  "Scapular Depressed",
];

const PERFORMANCE_ROWS: Omit<PerformanceRow, "value">[] = [
  { name: "Vertical Jump", unit: "in" },
  { name: "Broad Jump", unit: "in" },
  { name: "Penta Jump", unit: "in" },
  { name: "10Y Sprint", unit: "s" },
  { name: "Push Up", unit: "reps", kidsOnly: true },
  { name: "Chin Up", unit: "reps", kidsOnly: true },
];

export const RESULT_CATEGORIES = [
  "Flexibility",
  "Klatt",
  "Rocker",
  "Wobble & SitFit",
  "Overhead Squat",
  "Shoulder & Posture",
  "Muscle Fibre Type",
  "Strength Ratio",
  "Performance",
];

/** A fresh, empty assessment for an athlete — the coach's starting point. */
export function blankAssessment(athleteId: string): Assessment {
  return {
    id: `assess-${athleteId}`,
    athleteId,
    assessedBy: "",
    date: new Date().toISOString(),
    status: "draft",
    header: { heightCm: null, weightLb: null, bodyFatPct: null },
    flexibility: { rows: FLEXIBILITY_ROWS.map((n) => lr(n)), notes: "" },
    klatt: {
      rows: KLATT_FINDINGS.map((finding) => ({
        finding,
        marks: Array.from({ length: 8 }, () => false),
      })),
      notes: "",
    },
    rockerBoard: {
      frontBack: ROCKER_FRONT_BACK.map((n) => lr(n)),
      sideToSide: ROCKER_SIDE_TO_SIDE.map((n) => lr(n)),
      notes: "",
    },
    wobbleSitfit: {
      wobble: WOBBLE_ROWS.map((n) => lr(n)),
      sitfit: SITFIT_ROWS.map((n) => lr(n)),
      notes: "",
    },
    overheadSquat: { rows: OVERHEAD_SQUAT_ROWS.map((n) => yn(n)), notes: "" },
    shoulder: {
      irL: null,
      irR: null,
      erL: null,
      erR: null,
      posture: SHOULDER_POSTURE_ROWS.map((n) => lr(n)),
      notes: "",
    },
    bench: { est1Rm: null, achievedSetIdx: null },
    scott: { est1Rm: null, achievedSetIdx: null },
    fiberTest: { reps: null, notes: "" },
    trap3: { test8RmL: null, test8RmR: null },
    extRotation: { test8RmL: null, test8RmR: null },
    performance: {
      rows: PERFORMANCE_ROWS.map((r) => ({ ...r, value: null })),
      notes: "",
    },
    results: RESULT_CATEGORIES.map((category) => ({ category, summary: "" })),
  };
}

/* ------------------------------------------------------------------ */
/* Seed: Jordan's completed assessment                                 */
/* ------------------------------------------------------------------ */

function jordanAssessment(): Assessment {
  const a = blankAssessment("ath-jordan");
  a.id = "assess-jordan-1";
  a.assessedBy = "Coach Ellis";
  a.date = at(-45);
  a.status = "complete";
  a.header = { heightCm: 183, weightLb: 186, bodyFatPct: 12.4 };

  // Flexibility: tight left posterior chain, tight psoas both sides.
  a.flexibility.rows[0] = lr("Sagittal Hamstring", true, false);
  a.flexibility.rows[1] = lr("Medial Hamstring", true, false);
  a.flexibility.rows[6] = lr("Psoas", true, true);
  a.flexibility.notes =
    "Left hamstring group notably tighter than right — likely skating posture. Psoas short bilaterally.";

  // Klatt: left-leg knee dives on hops.
  a.klatt.rows[0]!.marks[0] = true; // Knee In · L-1
  a.klatt.rows[0]!.marks[2] = true; // Knee In · L-2
  a.klatt.rows[2]!.marks[0] = true; // Hops 45 In · L-1
  a.klatt.notes =
    "Knee tracks in on left-leg landings, worse under fatigue. Right side clean.";

  a.rockerBoard.frontBack[0] = lr("Hip Back in 1st 15", true, true);
  a.rockerBoard.frontBack[5] = lr("Heels Turn Out", true, false);
  a.rockerBoard.notes = "Hips shoot back early both sides; left heel spins out at depth.";

  a.wobbleSitfit.wobble[0] = lr("Knees Buckle", true, false);
  a.wobbleSitfit.sitfit[1] = lr("Foot Pronates", true, false);
  a.wobbleSitfit.notes = "Left ankle strategy weak — buckles under wobble, arch collapses on SitFit.";

  a.overheadSquat.rows[0] = yn("Heels Come Up", true);
  a.overheadSquat.rows[5] = yn("Arms Fall Forward", true);
  a.overheadSquat.notes = "Ankle dorsiflexion limits depth; t-spine extension improving.";

  a.shoulder.irL = "0–45°";
  a.shoulder.irR = "45–90°";
  a.shoulder.erL = "45–90°";
  a.shoulder.erR = ">90°";
  a.shoulder.posture[3] = lr("Scapular Protracted", true, false);
  a.shoulder.notes = "Left IR restricted; left scap sits protracted at rest — cue retraction in pressing.";

  // Strength: bench est 245 → best completed slot S8 (95% = 233 lb).
  a.bench = { est1Rm: 245, achievedSetIdx: 7 };
  // Scott curl est 95 → completed the full ladder (S9 = 95 lb).
  a.scott = { est1Rm: 95, achievedSetIdx: 8 };
  // 85% of 233 = 198.05 lb → 7 clean reps = mixed fiber type.
  a.fiberTest = { reps: 7, notes: "Bar speed even across all 7 — stopped at technical failure." };
  a.trap3 = { test8RmL: 20, test8RmR: 22.5 };
  a.extRotation = { test8RmL: 17.5, test8RmR: 20 };

  a.performance.rows[0]!.value = 28; // Vertical
  a.performance.rows[1]!.value = 112; // Broad — matches his PR
  a.performance.rows[2]!.value = 340; // Penta
  a.performance.rows[3]!.value = 1.72; // 10Y sprint
  a.performance.notes = "Elastic profile strong; sprint time will drop with cleaner knee drive.";

  a.results = [
    { category: "Flexibility", summary: "Left posterior chain + bilateral psoas — daily mobility block assigned." },
    { category: "Klatt", summary: "Left knee valgus on single-leg landings — priority for injury prevention." },
    { category: "Rocker", summary: "Early hip hinge strategy; retrain ankle-first descent." },
    { category: "Wobble & SitFit", summary: "Left ankle stability lags right — add single-leg balance work." },
    { category: "Overhead Squat", summary: "Ankle dorsiflexion is the limiter; heels-elevated work short-term." },
    { category: "Shoulder & Posture", summary: "Left IR deficit + protracted scap — pull volume 2:1 over press." },
    { category: "Muscle Fibre Type", summary: "Mixed (7 reps @ 85%) — train strength and reps in parallel." },
    { category: "Strength Ratio", summary: "Scott curl ratio on target; trap-3 right/left gap to close." },
    { category: "Performance", summary: "Jumps above age-group average; sprint mechanics the next lever." },
  ];
  return a;
}

export const assessments: Assessment[] = [jordanAssessment()];

export function assessmentForAthlete(athleteId: string): Assessment | undefined {
  return assessments.find((a) => a.athleteId === athleteId);
}
