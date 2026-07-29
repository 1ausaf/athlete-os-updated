/**
 * Training, programming, and scheduling demo data.
 *
 * Modeled directly on the client's real systems (shown in the feedback videos):
 * - TrainHeroic-style programming: per-set prescriptions, unit-switchable
 *   columns (reps / time / distance · lb / kg / % / BW), supersets (A1/A2),
 *   exercise library with videos + points of performance + a "reference max"
 *   (mother lift) for percentage-based programming, and master-program templates.
 * - Their real weekly schedule (lpsathletic.com/schedule) for bookable slots.
 * - Trello-style member ops: program due dates and membership buckets live on
 *   the athlete records in `data.ts`.
 */

import { athleteById, sessions } from "@/lib/demo/data";

const NOW = new Date();

function at(dayOffset: number, hour?: number, minute = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  if (hour != null) d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Units & prescription model                                          */
/* ------------------------------------------------------------------ */

/** How the load column is expressed. `pct` references the exercise's mother lift. */
export type LoadMode = "lb" | "kg" | "pct" | "bw";

/** What the "reps" column measures. */
export type RepMode =
  | "reps"
  | "time"
  | "distance"
  | "height"
  | "cal"
  | "watts"
  | "velocity";

export const LOAD_MODE_LABEL: Record<LoadMode, string> = {
  lb: "Weight (lb)",
  kg: "Weight (kg)",
  pct: "Weight (%)",
  bw: "Bodyweight",
};

export const REP_MODE_LABEL: Record<RepMode, string> = {
  reps: "Reps",
  time: "Time",
  distance: "Distance",
  height: "Height",
  cal: "Calories",
  watts: "Watts",
  velocity: "Velocity",
};

export const LB_PER_KG = 2.2046;

/**
 * Athlete-facing location labels (client: "should be At LPS — or remote;
 * remote could be at home, LPS would be at LPS").
 */
export const LOCATION_LABEL: Record<"gym" | "home", string> = {
  gym: "At LPS",
  home: "Remote",
};

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 2) / 2;
}
export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG);
}

/** One prescribed set. `target` is the reps/time/distance value ("6", "0:30", "60 m").
 *  `load` is numeric in `loadMode` units (a % when pct); null = athlete fills in. */
export interface SetRx {
  target: string;
  load: number | null;
  loadMode: LoadMode;
}

/* ------------------------------------------------------------------ */
/* Exercise library                                                    */
/* ------------------------------------------------------------------ */

/** One movement inside a circuit-style exercise (e.g. the dynamic warm-up). */
export interface CircuitItem {
  name: string;
  prescription: string;
  videoUrl: string;
}

export interface LibraryExercise {
  id: string;
  name: string;
  tags: string[];
  /** YouTube demo link (demo placeholder ids). */
  videoUrl: string | null;
  pointsOfPerformance: string[];
  /**
   * Circuit blocks carry one video PER movement (TrainHeroic-style: the
   * warm-up block holds 6 how-to videos the athlete flips through inline).
   */
  circuit?: CircuitItem[];
  /** Mother lift for %-based programming (e.g. Hip Snatch → 60% of Snatch). */
  referenceMax: string | null;
  defaultLoadMode: LoadMode;
  defaultRepMode: RepMode;
  createdBy: string;
}

/** Display totals matching the client's real library scale. */
export const LIBRARY_TOTALS = { exercises: 658, programs: 265, teams: 285 };

export const exerciseLibrary: LibraryExercise[] = [
  {
    id: "ex-snatch",
    name: "Snatch",
    tags: ["Olympic Lifts", "Barbell"],
    videoUrl: "https://youtu.be/9xQp2sldyts",
    pointsOfPerformance: ["Bar close to the body.", "Finish the pull tall.", "Punch and stabilize overhead."],
    referenceMax: null,
    defaultLoadMode: "kg",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-hip-snatch",
    name: "Hip Snatch",
    tags: ["Olympic Lifts", "Barbell"],
    videoUrl: "https://youtu.be/HqnoEOpbGjE",
    pointsOfPerformance: ["Integrate barbell into hips.", "Use the legs.", "Jump and throw the barbell."],
    referenceMax: "Snatch",
    defaultLoadMode: "pct",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-power-clean",
    name: "Power Clean",
    tags: ["Olympic Lifts", "Barbell"],
    videoUrl: "https://youtu.be/GVt3TjTPtP0",
    pointsOfPerformance: ["Jump, fast elbows.", "Meet the bar at the shoulder."],
    referenceMax: "Clean & Jerk",
    defaultLoadMode: "kg",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-clean-pull",
    name: "Clean Pull",
    tags: ["Olympic Lifts", "Barbell"],
    videoUrl: "https://youtu.be/ClnPull01",
    pointsOfPerformance: ["Push the floor away.", "Stay over the bar, finish tall."],
    referenceMax: "Clean & Jerk",
    defaultLoadMode: "pct",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-front-squat",
    name: "Front Squat",
    tags: ["Barbell", "Squat"],
    videoUrl: "https://youtu.be/FrntSqt01",
    pointsOfPerformance: ["Elbows high.", "Sit straight down, big brace."],
    referenceMax: null,
    defaultLoadMode: "kg",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-back-squat",
    name: "Back Squat",
    tags: ["Barbell", "Squat"],
    videoUrl: "https://youtu.be/BkSqt001",
    pointsOfPerformance: ["Break at hips and knees together.", "Drive the floor apart."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-trapbar-dl",
    name: "Trap-bar Deadlift",
    tags: ["Barbell", "Hinge"],
    videoUrl: "https://youtu.be/TrpBrDl01",
    pointsOfPerformance: ["Brace hard before the pull.", "Push, don't jerk, off the floor."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-bench",
    name: "Bench Press",
    tags: ["Barbell", "Horizontal Pressing"],
    videoUrl: "https://youtu.be/BnchPr01",
    pointsOfPerformance: ["Tempo 2ct down.", "Full lockout every rep."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-db-bench-neutral",
    name: "DB Bench Press — Neutral Grip",
    tags: ["Accessory Lifts", "Dumbbell", "Horizontal Pressing"],
    videoUrl: "https://youtu.be/DbBnchN01",
    pointsOfPerformance: ["Neutral grip, elbows 45°.", "Control the negative."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-weighted-pullup",
    name: "Weighted Pull-up",
    tags: ["Bodyweight", "Vertical Pulling"],
    videoUrl: "https://youtu.be/WtdPlUp01",
    pointsOfPerformance: ["Add load on the belt.", "Controlled negatives."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-chinup-supinated",
    name: "Supinated Chin-up",
    tags: ["Bodyweight", "Vertical Pulling"],
    videoUrl: "https://youtu.be/SupChn01",
    pointsOfPerformance: ["Chest to bar intent.", "Squeeze at the top."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-rdl",
    name: "Romanian Deadlift",
    tags: ["Barbell", "Hinge"],
    videoUrl: "https://youtu.be/Rdl00001",
    pointsOfPerformance: ["Hinge to mid-shin.", "Feel the hamstrings load."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-cs-row",
    name: "Chest-supported Row",
    tags: ["Accessory Lifts", "Horizontal Pulling"],
    videoUrl: "https://youtu.be/CsRow001",
    pointsOfPerformance: ["Squeeze the scap.", "No momentum off the pad."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-split-squat",
    name: "Split Squat",
    tags: ["Accessory Lifts", "Single Leg"],
    videoUrl: "https://youtu.be/SpltSqt01",
    pointsOfPerformance: ["Front foot flat, drive through mid-foot.", "Torso tall."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-step-up",
    name: "Step-ups — Dumbbell",
    tags: ["Accessory Lifts", "Single Leg", "Box"],
    videoUrl: "https://youtu.be/StpUp001",
    pointsOfPerformance: ["Full foot on the box.", "No push off the back leg."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-back-ext",
    name: "Back Extension — 45°",
    tags: ["Accessory Lifts", "Posterior Chain"],
    videoUrl: "https://youtu.be/BkExt451",
    pointsOfPerformance: ["Stick on shoulder, slight pause at top.", "Use a stick if too heavy."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-powell-raise",
    name: "Powell Raise — 30°",
    tags: ["Accessory Lifts", "Shoulder Health"],
    videoUrl: "https://youtu.be/PwlRs301",
    pointsOfPerformance: ["Strict — no swing.", "Pause at the top."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-iron-neck",
    name: "Iron Neck — Big 3",
    tags: ["Injury Prevention", "Neck"],
    videoUrl: "https://youtu.be/IrnNck01",
    pointsOfPerformance: ["8 reps per exercise, 3 exercises in total.", "Slow and controlled."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-farmer-walk",
    name: "Single-arm Farmer Walk",
    tags: ["Injury Prevention", "Carry"],
    videoUrl: "https://youtu.be/FrmWlk01",
    pointsOfPerformance: ["Full range of motion.", "Tall posture, no lean."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "distance",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-box-jump",
    name: "Box Jump",
    tags: ["Agility", "Box", "Plyometric"],
    videoUrl: "https://youtu.be/BxJmp001",
    pointsOfPerformance: ["Land soft, full hip extension.", "Step down between reps."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "height",
    createdBy: "AOS Global",
  },
  {
    id: "ex-a-walk",
    name: "A-Walks",
    tags: ["Speed", "Sprint Mechanics"],
    videoUrl: "https://youtu.be/AWalks01",
    pointsOfPerformance: ["Tall posture, toe up.", "Punch the knee, strike under hips."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "distance",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-a-skip",
    name: "A-Skips",
    tags: ["Speed", "Sprint Mechanics"],
    videoUrl: "https://youtu.be/ASkips01",
    pointsOfPerformance: ["Rhythmic skip, quick ground contact.", "Arms drive the pattern."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "distance",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-a-run",
    name: "A-Runs",
    tags: ["Speed", "Sprint Mechanics"],
    videoUrl: "https://youtu.be/ARuns001",
    pointsOfPerformance: ["Same shape as the skip — now continuous.", "Stay tall, cycle fast."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "distance",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-broad-jump",
    name: "Broad Jump",
    tags: ["Assessment", "Plyometric"],
    videoUrl: "https://youtu.be/BrdJmp01",
    pointsOfPerformance: ["Big arm swing.", "Stick the landing."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "distance",
    createdBy: "AOS Global",
  },
  {
    id: "ex-pallof",
    name: "Pallof Press",
    tags: ["Core", "Band", "Anti-rotation"],
    videoUrl: "https://youtu.be/Pallof01",
    pointsOfPerformance: ["Resist the twist.", "Exhale on the press."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "time",
    createdBy: "AOS Global",
  },
  {
    id: "ex-dead-bug",
    name: "Dead-bug",
    tags: ["Core", "Bodyweight"],
    videoUrl: "https://youtu.be/DdBug001",
    pointsOfPerformance: ["Low back stays glued down.", "Slow opposite arm/leg."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "reps",
    createdBy: "AOS Global",
  },
  {
    id: "ex-sled-push",
    name: "Sled Push",
    tags: ["Conditioning", "Ambulation"],
    videoUrl: "https://youtu.be/SldPsh01",
    pointsOfPerformance: ["Low, long strides.", "Arms locked, drive the legs."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "distance",
    createdBy: "LPS Athletic",
  },
  {
    id: "ex-mb-slam",
    name: "Med Ball Slam",
    tags: ["Power", "Med Ball"],
    videoUrl: "https://youtu.be/MbSlam01",
    pointsOfPerformance: ["Full reach at the top.", "Slam through the floor."],
    referenceMax: null,
    defaultLoadMode: "lb",
    defaultRepMode: "reps",
    createdBy: "AOS Global",
  },
  {
    id: "ex-pogo",
    name: "Pogo Jump",
    tags: ["Plyometric", "Bodyweight"],
    videoUrl: "https://youtu.be/PogoJp01",
    pointsOfPerformance: ["Stiff ankles, quick ground contact."],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "time",
    createdBy: "AOS Global",
  },
  {
    id: "ex-dyn-warmup",
    name: "Dynamic Warm-up (Lv. 2)",
    tags: ["Warm-up", "Circuit"],
    videoUrl: "https://youtu.be/DynWu201",
    pointsOfPerformance: [
      "Move with intent — this primes the whole session.",
      "Hold positions for a 2-count where noted.",
    ],
    circuit: [
      { name: "Lying leg raises", prescription: "1 set of 12 reps per leg", videoUrl: "https://youtu.be/DynWu201" },
      { name: "Page turn (T-spine rotation)", prescription: "1 set of 6 reps per side", videoUrl: "https://youtu.be/DynWu202" },
      { name: "Glute bridge", prescription: "1 set of 12 reps", videoUrl: "https://youtu.be/DynWu203" },
      { name: "Bird dog", prescription: "1 set of 6 per side", videoUrl: "https://youtu.be/DynWu204" },
      { name: "Walking groiner stretch", prescription: "1 set of 6 per side", videoUrl: "https://youtu.be/DynWu205" },
      { name: "Muscle snatch to overhead squat", prescription: "3×3 — dowel or bar only", videoUrl: "https://youtu.be/DynWu206" },
    ],
    referenceMax: null,
    defaultLoadMode: "bw",
    defaultRepMode: "reps",
    createdBy: "LPS Athletic",
  },
];

export const exerciseById = (id: string) =>
  exerciseLibrary.find((e) => e.id === id);

/* ------------------------------------------------------------------ */
/* Program model                                                       */
/* ------------------------------------------------------------------ */

export interface ProgramExercise {
  /** Slot label. A shared letter with a number marks a superset: B1 + B2. */
  slot: string;
  exerciseId: string;
  instructions?: string;
  /**
   * Round 5 (C16): a manual per-program note for this exercise instance.
   * When set it replaces the library's points of performance; when empty the
   * library default shows.
   */
  noteOverride?: string;
  repMode: RepMode;
  sets: SetRx[];
}

/** Section accent colors the coach can pick when renaming (round 5, C21). */
export const SECTION_COLORS = [
  "neutral",
  "red",
  "orange",
  "green",
  "blue",
  "purple",
] as const;
export type SectionColor = (typeof SECTION_COLORS)[number];

export interface ProgramSection {
  title: string;
  /** Coach-picked accent for the section header (round 5). */
  color?: SectionColor;
  exercises: ProgramExercise[];
}

export interface ProgramDay {
  id: string;
  dayNumber: number;
  /**
   * Round 5 (C17): weightlifters can train 3×/day — Day 1A / 1B / 1C. When
   * set, this replaces the plain "Day N" label ("1A", "1B"…).
   */
  dayLabel?: string;
  title: string;
  location: "gym" | "home";
  focus: string;
  /** Per-day publish state (C16). Undefined = published (legacy data). */
  published?: boolean;
  sections: ProgramSection[];
}

/** True when two consecutive slots belong to one superset group (B1/B2/B3). */
export function slotGroup(slot: string): string {
  return slot.replace(/\d+$/, "");
}
export function isSupersetSlot(slot: string): boolean {
  return /\d$/.test(slot);
}

const rx = (target: string, load: number | null, loadMode: LoadMode): SetRx => ({
  target,
  load,
  loadMode,
});

/** Jordan Vega — In-Season Power, Block C. Weekly sequence: Day 1..7, restarts Monday. */
export const jordanProgramDays: ProgramDay[] = [
  {
    id: "day-1",
    dayNumber: 1,
    title: "Lower Power",
    location: "gym",
    focus: "Realization — RPE 8 top sets, brace hard",
    sections: [
      {
        title: "Warm-up",
        exercises: [
          {
            slot: "A",
            exerciseId: "ex-dyn-warmup",
            instructions: "For completion",
            repMode: "reps",
            sets: [rx("1 round", null, "bw")],
          },
        ],
      },
      {
        title: "Speed Strength",
        exercises: [
          {
            slot: "B",
            exerciseId: "ex-hip-snatch",
            instructions: "Integrate bar in hips",
            repMode: "reps",
            sets: [rx("6", 60, "pct"), rx("6", 60, "pct"), rx("6", 60, "pct")],
          },
          {
            slot: "C",
            exerciseId: "ex-trapbar-dl",
            instructions: "RPE 8 top set — stop when target is hit",
            repMode: "reps",
            sets: [rx("3", 315, "lb"), rx("3", 345, "lb"), rx("3", 375, "lb"), rx("3", 375, "lb")],
          },
        ],
      },
      {
        title: "Strength",
        exercises: [
          {
            slot: "D1",
            exerciseId: "ex-bench",
            instructions: "Tempo 2ct, full lockout",
            repMode: "reps",
            sets: [rx("5", 215, "lb"), rx("5", 225, "lb"), rx("5", 235, "lb"), rx("5", 235, "lb")],
          },
          {
            slot: "D2",
            exerciseId: "ex-weighted-pullup",
            instructions: "Load on the belt, controlled negatives",
            repMode: "reps",
            sets: [rx("6", 45, "lb"), rx("6", 45, "lb"), rx("6", 45, "lb")],
          },
        ],
      },
      {
        title: "Accessory",
        exercises: [
          {
            slot: "E1",
            exerciseId: "ex-rdl",
            instructions: "Hinge to mid-shin",
            repMode: "reps",
            sets: [rx("8", 205, "lb"), rx("8", 205, "lb"), rx("8", 205, "lb")],
          },
          {
            slot: "E2",
            exerciseId: "ex-cs-row",
            instructions: "Back-off volume — squeeze scap",
            repMode: "reps",
            sets: [rx("10", 70, "lb"), rx("10", 70, "lb"), rx("10", 70, "lb")],
          },
        ],
      },
      {
        title: "Injury Prevention",
        exercises: [
          {
            slot: "F1",
            exerciseId: "ex-farmer-walk",
            instructions: "Full range of motion",
            repMode: "distance",
            sets: [rx("60 m", 70, "lb"), rx("60 m", 70, "lb"), rx("60 m", 70, "lb")],
          },
          {
            slot: "F2",
            exerciseId: "ex-pallof",
            instructions: "No rush — resist the twist",
            repMode: "time",
            sets: [rx("0:30", null, "bw"), rx("0:30", null, "bw"), rx("0:30", null, "bw")],
          },
        ],
      },
      {
        // Sprint mechanics close the session — a TRIPLE superset, exactly as
        // the client programs it in TrainHeroic (A-Walks → A-Skips → A-Runs).
        title: "Speed",
        exercises: [
          {
            slot: "G1",
            exerciseId: "ex-a-walk",
            instructions: "Walk the pattern — quality over pace",
            repMode: "distance",
            sets: [rx("15 yd", null, "bw"), rx("15 yd", null, "bw"), rx("15 yd", null, "bw")],
          },
          {
            slot: "G2",
            exerciseId: "ex-a-skip",
            instructions: "Skip the same pattern with rhythm",
            repMode: "distance",
            sets: [rx("15 yd", null, "bw"), rx("15 yd", null, "bw"), rx("15 yd", null, "bw")],
          },
          {
            slot: "G3",
            exerciseId: "ex-a-run",
            instructions: "Run it out — fast ground contact",
            repMode: "distance",
            sets: [rx("15 yd", null, "bw"), rx("15 yd", null, "bw"), rx("15 yd", null, "bw")],
          },
        ],
      },
    ],
  },
  {
    id: "day-2",
    dayNumber: 2,
    title: "Recovery & Core",
    location: "home",
    focus: "Skip this if you're at LPS — do Day 3 instead",
    sections: [
      {
        title: "Circuit",
        exercises: [
          {
            slot: "A1",
            exerciseId: "ex-dead-bug",
            instructions: "Slow, low back glued down",
            repMode: "reps",
            sets: [rx("10/side", null, "bw"), rx("10/side", null, "bw"), rx("10/side", null, "bw")],
          },
          {
            slot: "A2",
            exerciseId: "ex-pogo",
            instructions: "Quick ground contact",
            repMode: "time",
            sets: [rx("0:20", null, "bw"), rx("0:20", null, "bw"), rx("0:20", null, "bw")],
          },
          {
            slot: "A3",
            exerciseId: "ex-pallof",
            instructions: "Band around a post",
            repMode: "time",
            sets: [rx("0:30", null, "bw"), rx("0:30", null, "bw"), rx("0:30", null, "bw")],
          },
        ],
      },
    ],
  },
  {
    id: "day-3",
    dayNumber: 3,
    title: "Upper Strength",
    location: "gym",
    focus: "Intensification — leave one rep in reserve",
    sections: [
      {
        title: "Speed Strength",
        exercises: [
          {
            slot: "A",
            exerciseId: "ex-power-clean",
            instructions: "Jump, fast elbows",
            repMode: "reps",
            sets: [rx("4", 70, "pct"), rx("4", 75, "pct"), rx("4", 75, "pct"), rx("4", 75, "pct"), rx("4", 75, "pct")],
          },
        ],
      },
      {
        title: "Strength",
        exercises: [
          {
            slot: "B1",
            exerciseId: "ex-db-bench-neutral",
            instructions: "Elbows 45°",
            repMode: "reps",
            sets: [rx("10", 80, "lb"), rx("10", 85, "lb"), rx("10", 85, "lb"), rx("10", 85, "lb")],
          },
          {
            slot: "B2",
            exerciseId: "ex-chinup-supinated",
            instructions: "Chest to bar intent",
            repMode: "reps",
            sets: [rx("8", null, "bw"), rx("8", null, "bw"), rx("8", null, "bw"), rx("8", null, "bw")],
          },
        ],
      },
      {
        title: "Injury Prevention",
        exercises: [
          {
            slot: "C1",
            exerciseId: "ex-powell-raise",
            instructions: "Strict — no swing",
            repMode: "reps",
            sets: [rx("12", 10, "lb"), rx("12", 10, "lb"), rx("12", 10, "lb")],
          },
          {
            slot: "C2",
            exerciseId: "ex-iron-neck",
            instructions: "8 reps per exercise",
            repMode: "reps",
            sets: [rx("8", null, "bw"), rx("8", null, "bw"), rx("8", null, "bw")],
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Per-athlete published days (round 5, P7 — no more Jordan-only data)  */
/* ------------------------------------------------------------------ */

/** Maya Okafor — Off-Season Hypertrophy, Block A (kept deliberately small). */
export const mayaProgramDays: ProgramDay[] = [
  {
    id: "maya-day-1",
    dayNumber: 1,
    title: "Full Body A",
    location: "gym",
    focus: "Accumulation — controlled tempo, leave 2 in the tank",
    sections: [
      {
        title: "Warm-up",
        exercises: [
          {
            slot: "A",
            exerciseId: "ex-dyn-warmup",
            instructions: "For completion",
            repMode: "reps",
            sets: [rx("1 round", null, "bw")],
          },
        ],
      },
      {
        title: "Strength",
        exercises: [
          {
            slot: "B",
            exerciseId: "ex-back-squat",
            instructions: "3ct down, drive up tall",
            repMode: "reps",
            sets: [rx("8", 95, "lb"), rx("8", 105, "lb"), rx("8", 105, "lb")],
          },
          {
            slot: "C1",
            exerciseId: "ex-db-bench-neutral",
            instructions: "Elbows 45°",
            repMode: "reps",
            sets: [rx("10", 30, "lb"), rx("10", 30, "lb"), rx("10", 32.5, "lb")],
          },
          {
            slot: "C2",
            exerciseId: "ex-cs-row",
            instructions: "Squeeze 1ct at the top",
            repMode: "reps",
            sets: [rx("10", 40, "lb"), rx("10", 40, "lb"), rx("10", 45, "lb")],
          },
        ],
      },
      {
        title: "Accessory",
        exercises: [
          {
            slot: "D",
            exerciseId: "ex-split-squat",
            instructions: "Knee tracks the toe — post-ankle, build slow",
            repMode: "reps",
            sets: [rx("8/side", 20, "lb"), rx("8/side", 20, "lb")],
          },
          {
            slot: "E",
            exerciseId: "ex-pallof",
            instructions: "Ribs down, no lean",
            repMode: "reps",
            sets: [rx("10/side", 25, "lb"), rx("10/side", 25, "lb")],
          },
        ],
      },
    ],
  },
  {
    id: "maya-day-2",
    dayNumber: 2,
    title: "Jump & Core",
    location: "home",
    focus: "Elastic work + trunk — do this one at home",
    sections: [
      {
        title: "Circuit",
        exercises: [
          {
            slot: "A1",
            exerciseId: "ex-pogo",
            instructions: "Stiff ankles, quiet landings",
            repMode: "time",
            sets: [rx("0:20", null, "bw"), rx("0:20", null, "bw"), rx("0:20", null, "bw")],
          },
          {
            slot: "A2",
            exerciseId: "ex-dead-bug",
            instructions: "Low back stays glued down",
            repMode: "reps",
            sets: [rx("10/side", null, "bw"), rx("10/side", null, "bw"), rx("10/side", null, "bw")],
          },
        ],
      },
    ],
  },
  {
    id: "maya-day-3",
    dayNumber: 3,
    title: "Full Body B",
    location: "gym",
    focus: "Accumulation — same lifts, add a rep or 5 lb",
    sections: [
      {
        title: "Warm-up",
        exercises: [
          {
            slot: "A",
            exerciseId: "ex-dyn-warmup",
            instructions: "For completion",
            repMode: "reps",
            sets: [rx("1 round", null, "bw")],
          },
        ],
      },
      {
        title: "Strength",
        exercises: [
          {
            slot: "B",
            exerciseId: "ex-trapbar-dl",
            instructions: "Flat back, push the floor away",
            repMode: "reps",
            sets: [rx("6", 135, "lb"), rx("6", 155, "lb"), rx("6", 155, "lb")],
          },
          {
            slot: "C",
            exerciseId: "ex-step-up",
            instructions: "Full foot on the box",
            repMode: "reps",
            sets: [rx("8/side", 25, "lb"), rx("8/side", 25, "lb")],
          },
        ],
      },
    ],
  },
];

/** Noah Okafor — Academy Foundations (age 11: technique + play). */
export const noahProgramDays: ProgramDay[] = [
  {
    id: "noah-day-1",
    dayNumber: 1,
    title: "Movement Skills A",
    location: "gym",
    focus: "Foundations — jump, land, sprint, carry",
    sections: [
      {
        title: "Warm-up",
        exercises: [
          {
            slot: "A",
            exerciseId: "ex-dyn-warmup",
            instructions: "For completion — have fun with it",
            repMode: "reps",
            sets: [rx("1 round", null, "bw")],
          },
        ],
      },
      {
        title: "Skills",
        exercises: [
          {
            slot: "B",
            exerciseId: "ex-broad-jump",
            instructions: "Stick every landing for 2ct",
            repMode: "reps",
            sets: [rx("5", null, "bw"), rx("5", null, "bw")],
          },
          {
            slot: "C",
            exerciseId: "ex-a-skip",
            instructions: "Tall posture, big arms",
            repMode: "distance",
            sets: [rx("15 yd", null, "bw"), rx("15 yd", null, "bw"), rx("15 yd", null, "bw")],
          },
          {
            slot: "D",
            exerciseId: "ex-farmer-walk",
            instructions: "Shoulders back, no leaning",
            repMode: "distance",
            sets: [rx("20 yd", 15, "lb"), rx("20 yd", 15, "lb")],
          },
        ],
      },
    ],
  },
  {
    id: "noah-day-2",
    dayNumber: 2,
    title: "Movement Skills B",
    location: "gym",
    focus: "Foundations — throw, push, balance",
    sections: [
      {
        title: "Skills",
        exercises: [
          {
            slot: "A",
            exerciseId: "ex-mb-slam",
            instructions: "Whole body, slam hard",
            repMode: "reps",
            sets: [rx("6", 6, "lb"), rx("6", 6, "lb"), rx("6", 6, "lb")],
          },
          {
            slot: "B",
            exerciseId: "ex-sled-push",
            instructions: "Low and powerful",
            repMode: "distance",
            sets: [rx("15 yd", 45, "lb"), rx("15 yd", 45, "lb")],
          },
          {
            slot: "C",
            exerciseId: "ex-dead-bug",
            instructions: "Slow and steady",
            repMode: "reps",
            sets: [rx("8/side", null, "bw"), rx("8/side", null, "bw")],
          },
        ],
      },
    ],
  },
];

/**
 * The published days for a given athlete — every athlete surface must resolve
 * through this instead of reaching for `jordanProgramDays` (the round-5 parent
 * video caught Maya's portal showing Jordan's program).
 */
export function programDaysFor(athleteId: string): ProgramDay[] {
  switch (athleteId) {
    case "ath-jordan":
      return jordanProgramDays;
    case "ath-maya":
      return mayaProgramDays;
    case "ath-noah":
      return noahProgramDays;
    default:
      // Unseeded athletes get Maya's generic block so the demo always works.
      return mayaProgramDays;
  }
}

/* ------------------------------------------------------------------ */
/* Multi-week program (C10/C16) — weeks + auto-publish                 */
/* ------------------------------------------------------------------ */

export interface ProgramWeek {
  weekNumber: number;
  days: ProgramDay[];
}

export interface AthleteProgram {
  id: string;
  name: string;
  weeks: ProgramWeek[];
  /**
   * TrainHeroic-style rule (the client's real one): each day goes live to
   * the athlete at `hour` o'clock, `daysAhead` days before it is trained.
   */
  autoPublish: { enabled: boolean; daysAhead: number; hour: number };
}

/** Clone a day into a later week — new id, progressed focus, own publish flag. */
function weekVariant(
  day: ProgramDay,
  weekNumber: number,
  focusSuffix: string,
  published: boolean,
): ProgramDay {
  return {
    ...day,
    id: `wk${weekNumber}-${day.id}`,
    focus: `${day.focus} · ${focusSuffix}`,
    published,
    sections: day.sections.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((set) => ({ ...set })),
      })),
    })),
  };
}

/**
 * Jordan's full block — three weeks on the same weekly skeleton, progressed.
 * Week 1 is live (`jordanProgramDays` — the athlete side reads it directly),
 * week 2 is queued (day 1 already auto-published), week 3 is still draft.
 * Auto-publish mirrors the client's real rule: 5:00 AM, 4 days in advance.
 */
export const jordanProgram: AthleteProgram = {
  id: "prog-jordan-block-c",
  name: "In-Season Power — Block C",
  autoPublish: { enabled: true, daysAhead: 4, hour: 5 },
  weeks: [
    {
      weekNumber: 1,
      days: jordanProgramDays.map((d) => ({ ...d, published: true })),
    },
    {
      weekNumber: 2,
      days: jordanProgramDays.map((d, i) =>
        weekVariant(d, 2, "wave 2 — add 5 lb to top sets", i === 0),
      ),
    },
    {
      weekNumber: 3,
      days: jordanProgramDays.map((d) =>
        weekVariant(d, 3, "wave 3 — deload −10%, move with speed", false),
      ),
    },
  ],
};

/** Section skeleton used when scaffolding an empty master-template day. */
const TEMPLATE_SECTION_TITLES = ["Warm-up", "Strength", "Accessory"];

/**
 * Build an editable weeks × days/wk scaffold for the template builder (C10).
 * With `seedDays`, day structures are cycled from the seed (movements only —
 * copies onto athletes keep their own loads); without, days start empty.
 */
export function scaffoldProgram(opts: {
  id: string;
  name: string;
  weeks: number;
  daysPerWeek: number;
  remoteDays?: number;
  seedDays?: ProgramDay[];
}): AthleteProgram {
  const weekCount = Math.max(1, Math.min(Math.round(opts.weeks) || 1, 12));
  const daysPerWeek = Math.max(1, Math.min(Math.round(opts.daysPerWeek) || 1, 7));
  return {
    id: opts.id,
    name: opts.name,
    autoPublish: { enabled: true, daysAhead: 4, hour: 5 },
    weeks: Array.from({ length: weekCount }, (_, w) => ({
      weekNumber: w + 1,
      days: Array.from({ length: daysPerWeek }, (_, d): ProgramDay => {
        const seed =
          opts.seedDays && opts.seedDays.length > 0
            ? opts.seedDays[d % opts.seedDays.length]
            : undefined;
        const remote =
          opts.remoteDays != null && d >= daysPerWeek - opts.remoteDays;
        return {
          id: `${opts.id}-wk${w + 1}-day-${d + 1}`,
          dayNumber: d + 1,
          title: seed ? seed.title : `Day ${d + 1}`,
          location: seed ? seed.location : remote ? "home" : "gym",
          focus: seed
            ? seed.focus
            : "Template scaffolding — add movements from the library",
          published: false,
          sections: seed
            ? seed.sections.map((s) => ({
                ...s,
                exercises: s.exercises.map((e) => ({
                  ...e,
                  sets: e.sets.map((set) => ({ ...set })),
                })),
              }))
            : TEMPLATE_SECTION_TITLES.map((title) => ({ title, exercises: [] })),
        };
      }),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Athlete maxes + history (for % programming and "last time" display) */
/* ------------------------------------------------------------------ */

export interface ReferenceMaxEntry {
  value: number;
  unit: "kg" | "lb";
}

/** 1RM references per athlete, keyed by mother-lift name. */
export const athleteMaxes: Record<string, Record<string, ReferenceMaxEntry>> = {
  "ath-jordan": {
    Snatch: { value: 90, unit: "kg" },
    "Clean & Jerk": { value: 110, unit: "kg" },
    "Back Squat": { value: 315, unit: "lb" },
    "Trap-bar Deadlift": { value: 385, unit: "lb" },
    "Bench Press": { value: 245, unit: "lb" },
  },
  "ath-ren": {
    Snatch: { value: 130, unit: "kg" },
    "Clean & Jerk": { value: 162, unit: "kg" },
    "Back Squat": { value: 210, unit: "kg" },
  },
};

export interface ExerciseHistory {
  /** e.g. "4×3 @ 365 lb" */
  lastSummary: string;
  lastDate: string;
  /** e.g. "385 lb — best" */
  bestSummary: string;
  isRecentPr?: boolean;
}

/** Jordan's per-exercise history — shown inline in the logger. */
export const jordanExerciseHistory: Record<string, ExerciseHistory> = {
  "ex-trapbar-dl": {
    lastSummary: "4×3 @ 365 lb",
    lastDate: at(-7),
    bestSummary: "1 @ 385 lb",
    isRecentPr: true,
  },
  "ex-bench": {
    lastSummary: "4×5 @ 230 lb",
    lastDate: at(-5),
    bestSummary: "1 @ 245 lb",
  },
  "ex-hip-snatch": {
    lastSummary: "3×6 @ 54 kg (60%)",
    lastDate: at(-7),
    bestSummary: "Snatch ref max 90 kg",
  },
  "ex-power-clean": {
    lastSummary: "5×4 @ 77 kg (70%)",
    lastDate: at(-9),
    bestSummary: "C&J ref max 110 kg",
  },
  "ex-weighted-pullup": {
    lastSummary: "3×6 @ 40 lb",
    lastDate: at(-5),
    bestSummary: "3 @ 55 lb",
  },
  "ex-rdl": {
    lastSummary: "3×8 @ 195 lb",
    lastDate: at(-7),
    bestSummary: "6 @ 225 lb",
  },
  "ex-cs-row": {
    lastSummary: "3×10 @ 65 lb",
    lastDate: at(-5),
    bestSummary: "8 @ 75 lb",
  },
  "ex-db-bench-neutral": {
    lastSummary: "4×10 @ 80 lb",
    lastDate: at(-12),
    bestSummary: "8 @ 90 lb",
  },
  "ex-chinup-supinated": {
    lastSummary: "4×8 BW",
    lastDate: at(-12),
    bestSummary: "14 @ BW",
  },
  "ex-farmer-walk": {
    lastSummary: "3×60 m @ 70 lb",
    lastDate: at(-7),
    bestSummary: "60 m @ 90 lb",
  },
};

/* ------------------------------------------------------------------ */
/* Bookable schedule (mirrors lpsathletic.com/schedule)                */
/* ------------------------------------------------------------------ */

export interface BookableSlot {
  id: string;
  /** ISO start / end. */
  startsAt: string;
  endsAt: string;
  label: "Coaching" | "Master Coaching" | "Weightlifting Team";
  spotsLeft: number;
  capacity: number;
}

/** What each session type is + what an athlete needs before booking it. */
export const SESSION_TYPE_INFO: Record<
  BookableSlot["label"],
  { description: string; requirements: string[] }
> = {
  Coaching: {
    description:
      "Semi-private coached block — you follow your own individualized program with a coach on the floor.",
    requirements: ["Active membership in good standing"],
  },
  "Master Coaching": {
    description:
      "Small-group session led by a head coach — advanced loading, technical priority on the platforms.",
    requirements: [
      "Completed remapping assessment",
      "Head-coach invitation on file",
    ],
  },
  "Weightlifting Team": {
    description:
      "Competitive Olympic weightlifting squad training — snatch and clean & jerk focus with meet prep.",
    requirements: [
      "Weightlifting team members only",
      "Coach sign-off on current 1RMs",
    ],
  },
};

/** Weekly pattern: [dayOfWeek (0=Sun), startHour, startMin, durMin, label]. */
const WEEK_PATTERN: [number, number, number, number, BookableSlot["label"]][] = [
  [1, 8, 30, 90, "Coaching"],
  [1, 10, 0, 120, "Master Coaching"],
  [1, 16, 0, 90, "Coaching"],
  [1, 17, 30, 90, "Coaching"],
  [2, 8, 30, 90, "Coaching"],
  [2, 10, 0, 120, "Master Coaching"],
  [2, 16, 0, 90, "Coaching"],
  [3, 8, 30, 90, "Coaching"],
  [3, 10, 0, 120, "Master Coaching"],
  [3, 11, 30, 90, "Coaching"],
  [3, 16, 0, 90, "Coaching"],
  [4, 9, 0, 90, "Coaching"],
  [4, 10, 30, 90, "Coaching"],
  [4, 10, 30, 120, "Weightlifting Team"],
  [4, 16, 0, 90, "Coaching"],
  [5, 8, 30, 90, "Coaching"],
  [5, 16, 0, 90, "Coaching"],
  [6, 13, 0, 90, "Coaching"],
  [6, 14, 30, 90, "Coaching"],
];

/** Deterministic pseudo-spots so the list looks alive without Math.random. */
function spotsFor(weekIdx: number, slotIdx: number, capacity: number): number {
  const h = (weekIdx * 7 + slotIdx * 3) % (capacity + 2);
  return Math.max(0, Math.min(capacity, capacity - h));
}

/**
 * Generate `weeks` weeks of bookable slots. Weeks run Monday→Sunday (client:
 * "Monday is the first day of the week — if there's a Monday, we should see
 * the Sunday too"), so generation starts from THIS week's Monday and slots
 * already started today are filtered out.
 */
export function generateBookableSlots(weeks = 12): BookableSlot[] {
  const out: BookableSlot[] = [];
  const now = new Date(NOW);
  const start = new Date(NOW);
  // Roll back to Monday of the current week (getDay(): Sun=0 … Sat=6).
  const dow0 = start.getDay();
  start.setDate(start.getDate() - ((dow0 + 6) % 7));
  start.setHours(0, 0, 0, 0);

  for (let d = 0; d < weeks * 7; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const dow = day.getDay();
    const weekIdx = Math.floor(d / 7);
    WEEK_PATTERN.forEach(([pdow, h, m, dur, label], i) => {
      if (pdow !== dow) return;
      const s = new Date(day);
      s.setHours(h, m, 0, 0);
      if (s.getTime() <= now.getTime()) return; // already started — not bookable
      const e = new Date(s.getTime() + dur * 60000);
      const capacity = label === "Master Coaching" ? 8 : 6;
      out.push({
        id: `slot-${d}-${i}`,
        startsAt: s.toISOString(),
        endsAt: e.toISOString(),
        label,
        capacity,
        spotsLeft: spotsFor(weekIdx, i + d, capacity),
      });
    });
  }
  return out;
}

/**
 * Session types an athlete cannot self-book without staff approval (client:
 * "there's something in the back end that allows them the permission to book
 * this"). Jordan hasn't been added to the Weightlifting Team yet — coaches
 * grant access from the athlete's card.
 */
export function restrictedSessionTypesFor(
  athleteId: string,
): Set<BookableSlot["label"]> {
  const approved: Record<string, BookableSlot["label"][]> = {
    "ath-ren": ["Weightlifting Team"], // Ren is on the WL team
  };
  const all: BookableSlot["label"][] = ["Weightlifting Team"];
  const mine = new Set(approved[athleteId] ?? []);
  return new Set(all.filter((l) => !mine.has(l)));
}

/** Jordan's currently-booked upcoming sessions (athlete portal view). */
export interface MyBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  label: BookableSlot["label"];
  status: "confirmed" | "waitlisted";
}

export const myBookings: MyBooking[] = [
  { id: "bk-1", startsAt: at(0, 16), endsAt: at(0, 17, 30), label: "Coaching", status: "confirmed" },
  { id: "bk-2", startsAt: at(1, 8, 30), endsAt: at(1, 10), label: "Coaching", status: "confirmed" },
  { id: "bk-3", startsAt: at(3, 16), endsAt: at(3, 17, 30), label: "Coaching", status: "confirmed" },
];

/** A session the athlete already attended (round 5, A9: the Sessions page
 *  "Past sessions" tab — "so we can count their sessions"). */
export interface PastBooking {
  id: string;
  startsAt: string;
  endsAt: string;
  label: BookableSlot["label"];
  attended: boolean;
  coach: string;
}

export const pastBookings: PastBooking[] = [
  { id: "pb-1", startsAt: at(-2, 16), endsAt: at(-2, 17, 30), label: "Coaching", attended: true, coach: "Coach Ellis" },
  { id: "pb-2", startsAt: at(-4, 8, 30), endsAt: at(-4, 10), label: "Coaching", attended: true, coach: "Coach Nadia" },
  { id: "pb-3", startsAt: at(-7, 16), endsAt: at(-7, 17, 30), label: "Coaching", attended: true, coach: "Coach Ellis" },
  { id: "pb-4", startsAt: at(-9, 16), endsAt: at(-9, 17, 30), label: "Coaching", attended: false, coach: "Coach Ellis" },
  { id: "pb-5", startsAt: at(-11, 8, 30), endsAt: at(-11, 10), label: "Coaching", attended: true, coach: "Coach Clance" },
  { id: "pb-6", startsAt: at(-14, 16), endsAt: at(-14, 17, 30), label: "Coaching", attended: true, coach: "Coach Ellis" },
  { id: "pb-7", startsAt: at(-16, 16), endsAt: at(-16, 17, 30), label: "Coaching", attended: true, coach: "Coach Nadia" },
  { id: "pb-8", startsAt: at(-18, 8, 30), endsAt: at(-18, 10), label: "Coaching", attended: true, coach: "Coach Ellis" },
];

/** A completed program day (round 5, A2: the Training page "Past completed
 *  sessions" tab). Opens in the logger so data can be fixed after the fact. */
export interface CompletedSession {
  dayId: string;
  dayNumber: number;
  title: string;
  completedOn: string;
  /** e.g. "18 sets · 42 min" — the list-row summary. */
  summary: string;
}

export const completedSessions: CompletedSession[] = [
  { dayId: "day-1", dayNumber: 1, title: "Lower Power", completedOn: at(-2, 17), summary: "17 sets · 52 min" },
  { dayId: "day-3", dayNumber: 3, title: "Upper Strength", completedOn: at(-4, 9), summary: "15 sets · 47 min" },
  { dayId: "day-1", dayNumber: 1, title: "Lower Power", completedOn: at(-9, 17), summary: "17 sets · 55 min" },
  { dayId: "day-2", dayNumber: 2, title: "Recovery & Core", completedOn: at(-10, 8), summary: "8 sets · 24 min" },
  { dayId: "day-3", dayNumber: 3, title: "Upper Strength", completedOn: at(-11, 9), summary: "15 sets · 44 min" },
  { dayId: "day-1", dayNumber: 1, title: "Lower Power", completedOn: at(-16, 17), summary: "16 sets · 49 min" },
];

/* ------------------------------------------------------------------ */
/* Announcements (read-only community feed)                            */
/* ------------------------------------------------------------------ */

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  at: string;
}

export const announcements: Announcement[] = [
  {
    id: "ann-1",
    title: "Holiday hours — Monday",
    body: "The floor opens at 8am on the holiday Monday. Book early, spots fill fast. 🐺",
    author: "Kayla Chen",
    at: at(-3, 10),
  },
  {
    id: "ann-2",
    title: "Summer testing week — book your slot",
    body: "Testing week starts in three weeks: broad jump, 10yd fly, trap-bar max. Every in-gym athlete needs a slot — see the schedule.",
    author: "Coach Clance",
    at: at(-6, 9),
  },
  {
    id: "ann-3",
    title: "7 LPS athletes at the OHL combine",
    body: "Huge weekend — seven of ours competed at the combine. Proud of the work. The standard is the standard.",
    author: "Coach Clance",
    at: at(-12, 18),
  },
  {
    id: "ann-4",
    title: "Turf install — Floor B closed Friday AM",
    body: "New turf going down Friday morning. Morning sessions run on Floor A racks only; speed work moves to Saturday.",
    author: "Kayla Chen",
    at: at(-15, 12),
  },
];

/* ------------------------------------------------------------------ */
/* Program templates ("master programs")                               */
/* ------------------------------------------------------------------ */

export interface ProgramTemplate {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  weeks: number;
  daysPerWeek: number;
  description: string;
  remoteDays?: number;
  createdBy: string;
  /** ISO date the master was added — powers the "Newest" library sort (C10). */
  createdAt: string;
  /** ISO date of the last edit — powers the "Last modified" sort (round 5). */
  lastModified?: string;
  tags: string[];
  /** Audience labels — kids / foundation / executive / per-sport (round 5). */
  labels?: string[];
}

/** Program-library audience labels the client asked to manage (C25). */
export const PROGRAM_LABELS = [
  "Kids",
  "Foundation",
  "Executive",
  "Athletes",
  "Hockey",
  "Basketball",
  "Golf",
  "Track",
] as const;

export const programTemplates: ProgramTemplate[] = [
  {
    id: "tpl-phase0",
    name: "AAS (4×/wk) — Phase 0 · 2× LPS / 2× Remote [Master]",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 4,
    remoteDays: 2,
    description: "Hybrid on-boarding block — two in-gym, two remote days per week.",
    createdBy: "Coach Clance",
    createdAt: "2026-05-18",
    lastModified: "2026-07-18",
    labels: ["Athletes", "Foundation"],
    tags: ["Hybrid", "On-boarding"],
  },
  {
    id: "tpl-sb",
    name: "AAS — Structural Balance [Master]",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 4,
    description: "Foundation block — balance ratios before intensification.",
    createdBy: "Coach Clance",
    createdAt: "2025-11-03",
    tags: ["Structural Balance"],
  },
  {
    id: "tpl-sb-v1",
    name: "AAS — Structural Balance — Variation 1",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 3,
    description: "SB variation with rotated accessory emphasis.",
    createdBy: "Coach Clance",
    createdAt: "2026-01-21",
    tags: ["Structural Balance", "Variation"],
  },
  {
    id: "tpl-pl-max",
    name: "AAS — Powerlifting — MAX [1]",
    level: "Advanced",
    weeks: 3,
    daysPerWeek: 4,
    description: "Realization block — singles at RPE 8–9, taper to test.",
    createdBy: "Coach Clance",
    createdAt: "2026-06-09",
    lastModified: "2026-07-21",
    labels: ["Athletes"],
    tags: ["Powerlifting", "Realization"],
  },
  {
    id: "tpl-pl-max-partial",
    name: "AAS — Powerlifting — MAX Partial [1]",
    level: "Advanced",
    weeks: 3,
    daysPerWeek: 4,
    description: "Overload with partials before the full-range max block.",
    createdBy: "Coach Clance",
    createdAt: "2026-06-30",
    lastModified: "2026-07-02",
    labels: ["Athletes"],
    tags: ["Powerlifting", "Overload"],
  },
  {
    id: "tpl-sb-cj",
    name: "AAS — Structural Balance — Pyramid + CJ",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 4,
    description: "SB pyramid loading with clean & jerk technique work.",
    createdBy: "Coach Clance",
    createdAt: "2026-02-12",
    lastModified: "2026-05-30",
    labels: ["Athletes", "Foundation"],
    tags: ["Structural Balance", "Olympic Lifts"],
  },
  {
    id: "tpl-sb-exec",
    name: "AAS — Structural Balance — ADV Executive",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 2,
    description: "Executive schedule — 2×/wk full-body with mobility finishers.",
    createdBy: "Coach Clance",
    createdAt: "2025-09-26",
    lastModified: "2026-06-11",
    labels: ["Executive"],
    tags: ["Structural Balance", "Executive"],
  },
  {
    id: "tpl-golf",
    name: "Golf Power — Phase 2",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 2,
    description: "Rotational power + posterior chain for the Sunday golf group.",
    createdBy: "Coach Nadia",
    createdAt: "2026-04-07",
    lastModified: "2026-07-12",
    labels: ["Golf", "Executive"],
    tags: ["Golf", "Rotational Power"],
  },
  {
    id: "tpl-sprint-a",
    name: "Sprint Development — Block A",
    level: "Intermediate",
    weeks: 6,
    daysPerWeek: 3,
    description: "Acceleration + max-velocity foundation for the track club.",
    createdBy: "Coach Nadia",
    createdAt: "2026-05-02",
    lastModified: "2026-07-24",
    labels: ["Track", "Kids"],
    tags: ["Speed", "Team"],
  },
  {
    id: "tpl-baseball-1",
    name: "Off-season Baseball — Phase 1",
    level: "Intermediate",
    weeks: 4,
    daysPerWeek: 4,
    description: "GPP + arm-care foundation for the Tigers HPP group.",
    createdBy: "Coach Ellis",
    createdAt: "2026-06-16",
    lastModified: "2026-07-08",
    labels: ["Athletes"],
    tags: ["Baseball", "Team"],
  },
];

/* ------------------------------------------------------------------ */
/* Groups (shared-program teams)                                       */
/* ------------------------------------------------------------------ */

/** A named contact on a team (round 5, C13 — mirrors the client's Trello
 *  team cards: current + past contacts, each with phone/email). */
export interface TeamContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  active: boolean;
}

export interface TrainingGroup {
  id: string;
  name: string;
  athleteCount: number;
  memberAthleteIds: string[];
  program: string;
  /** Sessions filled in vs prescribed this week. */
  compliance: { filled: number; total: number };
  lastSession: string;
  /** Round 5 (teams-as-clients): what the team trains for. */
  focus: string;
  /** Coaches on the team — teams carry multiple coaches (C9). */
  coachNames: string[];
  /** Team-level contacts (manager, head coach at the club, etc.). */
  contacts: TeamContact[];
  initials: string;
  hue: number;
}

export const trainingGroups: TrainingGroup[] = [
  {
    id: "grp-golf",
    name: "Sunday Golf Group",
    athleteCount: 6,
    memberAthleteIds: ["ath-leo"],
    program: "Golf Power — Phase 2",
    compliance: { filled: 3, total: 7 },
    lastSession: at(-2, 10),
    focus: "Golf — rotational power",
    coachNames: ["Coach Ellis", "Coach Nadia"],
    contacts: [
      { name: "Grant Whitfield", role: "Group organizer", phone: "+1 (416) 555-0139", email: "grant.w@example.com", active: true },
    ],
    initials: "GG",
    hue: 145,
  },
  {
    id: "grp-track",
    name: "Quest Sports Track Club",
    athleteCount: 14,
    memberAthleteIds: [],
    program: "Sprint Development — Block A",
    compliance: { filled: 9, total: 14 },
    lastSession: at(-1, 17),
    focus: "Track — sprint development",
    coachNames: ["Coach Clance", "Coach Ellis", "Coach Nadia"],
    contacts: [
      { name: "Angela Reyes", role: "Club manager", phone: "+1 (647) 555-0186", email: "angela@questtrack.ca", active: true },
      { name: "Devon Cole", role: "Head club coach", phone: "+1 (647) 555-0121", email: "devon@questtrack.ca", active: true },
      { name: "Marcus Obi", role: "Former manager", phone: "+1 (647) 555-0104", email: "marcus.obi@example.com", active: false },
    ],
    initials: "QT",
    hue: 215,
  },
  {
    id: "grp-tigers",
    name: "Tigers HPP [A]",
    athleteCount: 12,
    memberAthleteIds: ["ath-ty"],
    program: "Off-season Baseball — Phase 1",
    compliance: { filled: 8, total: 12 },
    lastSession: at(-3, 16),
    focus: "Baseball — off-season",
    coachNames: ["Coach Clance", "Coach Nadia"],
    contacts: [
      { name: "Rick Alvarez", role: "Program director", phone: "+1 (905) 555-0175", email: "rick@tigershpp.com", active: true },
    ],
    initials: "TH",
    hue: 30,
  },
];

export function trainingGroupById(id: string): TrainingGroup | undefined {
  return trainingGroups.find((g) => g.id === id);
}

/* ------------------------------------------------------------------ */
/* Analytics: session summaries + lift history                         */
/* ------------------------------------------------------------------ */

export interface SessionSummary {
  date: string;
  title: string;
  reps: number;
  volumeKg: number;
  durationMin: number;
  blocksCompleted: string;
}

export const trainingSummaries: Record<string, SessionSummary[]> = {
  "ath-jordan": [
    { date: at(-2), title: "Block C — Day 13", reps: 96, volumeKg: 7420, durationMin: 64, blocksCompleted: "5/5" },
    { date: at(-5), title: "Block C — Day 12", reps: 88, volumeKg: 6980, durationMin: 58, blocksCompleted: "5/5" },
    { date: at(-7), title: "Block C — Day 11", reps: 104, volumeKg: 8130, durationMin: 71, blocksCompleted: "4/5" },
    { date: at(-9), title: "Block C — Day 10", reps: 92, volumeKg: 7255, durationMin: 62, blocksCompleted: "5/5" },
    { date: at(-12), title: "Block C — Day 9", reps: 84, volumeKg: 6540, durationMin: 55, blocksCompleted: "5/5" },
    { date: at(-14), title: "Block C — Day 8", reps: 100, volumeKg: 7810, durationMin: 66, blocksCompleted: "5/5" },
    { date: at(-16), title: "Block C — Day 7", reps: 90, volumeKg: 7040, durationMin: 61, blocksCompleted: "5/5" },
    { date: at(-19), title: "Block C — Day 6", reps: 82, volumeKg: 6310, durationMin: 54, blocksCompleted: "5/5" },
    { date: at(-21), title: "Block C — Day 5", reps: 97, volumeKg: 7580, durationMin: 68, blocksCompleted: "5/5" },
    { date: at(-23), title: "Block C — Day 4", reps: 86, volumeKg: 6720, durationMin: 57, blocksCompleted: "4/5" },
    { date: at(-26), title: "Block C — Day 3", reps: 94, volumeKg: 7310, durationMin: 63, blocksCompleted: "5/5" },
    { date: at(-28), title: "Block C — Day 2", reps: 89, volumeKg: 6890, durationMin: 59, blocksCompleted: "5/5" },
    { date: at(-30), title: "Block C — Day 1", reps: 78, volumeKg: 6120, durationMin: 52, blocksCompleted: "5/5" },
    { date: at(-35), title: "Block B — Day 16", reps: 102, volumeKg: 7930, durationMin: 69, blocksCompleted: "5/5" },
    { date: at(-40), title: "Block B — Day 15", reps: 95, volumeKg: 7460, durationMin: 64, blocksCompleted: "4/5" },
    { date: at(-47), title: "Block B — Day 13", reps: 88, volumeKg: 6850, durationMin: 58, blocksCompleted: "5/5" },
    { date: at(-54), title: "Block B — Day 11", reps: 91, volumeKg: 7150, durationMin: 62, blocksCompleted: "5/5" },
    { date: at(-61), title: "Block B — Day 9", reps: 85, volumeKg: 6610, durationMin: 56, blocksCompleted: "5/5" },
    { date: at(-75), title: "Block B — Day 6", reps: 99, volumeKg: 7720, durationMin: 67, blocksCompleted: "5/5" },
    { date: at(-89), title: "Block B — Day 2", reps: 80, volumeKg: 6240, durationMin: 53, blocksCompleted: "4/5" },
  ],
  "ath-ren": [
    { date: at(-1), title: "Peaking — Day 17", reps: 42, volumeKg: 4980, durationMin: 75, blocksCompleted: "4/4" },
    { date: at(-3), title: "Peaking — Day 16", reps: 56, volumeKg: 6420, durationMin: 82, blocksCompleted: "4/4" },
    { date: at(-5), title: "Peaking — Day 15", reps: 64, volumeKg: 7360, durationMin: 88, blocksCompleted: "4/4" },
    { date: at(-8), title: "Peaking — Day 14", reps: 71, volumeKg: 8115, durationMin: 90, blocksCompleted: "3/4" },
    { date: at(-10), title: "Peaking — Day 13", reps: 69, volumeKg: 7890, durationMin: 85, blocksCompleted: "4/4" },
  ],
  "ath-maya": [
    { date: at(-1), title: "Block A — Day 6", reps: 110, volumeKg: 4320, durationMin: 52, blocksCompleted: "4/4" },
    { date: at(-4), title: "Block A — Day 5", reps: 98, volumeKg: 3980, durationMin: 49, blocksCompleted: "4/4" },
    { date: at(-6), title: "Block A — Day 4", reps: 106, volumeKg: 4150, durationMin: 55, blocksCompleted: "3/4" },
  ],
};

export interface LiftPoint {
  date: string;
  reps: number;
  weight: number;
  unit: "kg" | "lb";
  e1rm: number;
}

/** Estimated-1RM history per athlete per lift (Epley-style points). */
export const liftHistory: Record<string, Record<string, LiftPoint[]>> = {
  "ath-jordan": {
    "Trap-bar Deadlift": [
      { date: at(-360), reps: 10, weight: 255, unit: "lb", e1rm: 340 },
      { date: at(-300), reps: 5, weight: 295, unit: "lb", e1rm: 344 },
      { date: at(-240), reps: 5, weight: 305, unit: "lb", e1rm: 356 },
      { date: at(-170), reps: 3, weight: 325, unit: "lb", e1rm: 358 },
      { date: at(-100), reps: 2, weight: 345, unit: "lb", e1rm: 368 },
      { date: at(-60), reps: 3, weight: 345, unit: "lb", e1rm: 379 },
      { date: at(-45), reps: 3, weight: 355, unit: "lb", e1rm: 390 },
      { date: at(-30), reps: 2, weight: 365, unit: "lb", e1rm: 389 },
      { date: at(-14), reps: 3, weight: 365, unit: "lb", e1rm: 401 },
      { date: at(-2), reps: 1, weight: 385, unit: "lb", e1rm: 385 },
    ],
    "Bench Press": [
      { date: at(-355), reps: 10, weight: 165, unit: "lb", e1rm: 220 },
      { date: at(-310), reps: 5, weight: 185, unit: "lb", e1rm: 216 },
      { date: at(-250), reps: 3, weight: 205, unit: "lb", e1rm: 226 },
      { date: at(-185), reps: 2, weight: 215, unit: "lb", e1rm: 229 },
      { date: at(-120), reps: 5, weight: 205, unit: "lb", e1rm: 239 },
      // 10-rep test day — matches the 205 × 10 PR on the athlete's card (A4).
      { date: at(-71), reps: 10, weight: 205, unit: "lb", e1rm: 273 },
      { date: at(-55), reps: 5, weight: 215, unit: "lb", e1rm: 251 },
      { date: at(-40), reps: 5, weight: 225, unit: "lb", e1rm: 262 },
      // Tested single — matches the 245 × 1 PR on the athlete's card (A4).
      { date: at(-30), reps: 1, weight: 245, unit: "lb", e1rm: 245 },
      { date: at(-20), reps: 3, weight: 235, unit: "lb", e1rm: 258 },
      { date: at(-5), reps: 5, weight: 230, unit: "lb", e1rm: 268 },
    ],
  },
  "ath-ren": {
    "Back Squat": [
      { date: at(-40), reps: 5, weight: 185, unit: "kg", e1rm: 216 },
      { date: at(-25), reps: 3, weight: 195, unit: "kg", e1rm: 214 },
      { date: at(-12), reps: 5, weight: 190, unit: "kg", e1rm: 222 },
      { date: at(-4), reps: 2, weight: 205, unit: "kg", e1rm: 219 },
    ],
    Snatch: [
      { date: at(-30), reps: 1, weight: 125, unit: "kg", e1rm: 125 },
      { date: at(-8), reps: 1, weight: 130, unit: "kg", e1rm: 130 },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Nutrition protocol                                                  */
/* ------------------------------------------------------------------ */

/** One weekly weigh-in entry (their TrainHeroic "Weekly Body Weigh-in & Body Fat Check"). */
export interface NutritionCheckIn {
  date: string;
  weightLb: number;
  bodyFatPct: number;
}

/** Lean mass in lb, derived the way their template tracks it. */
export function leanMassLb(c: Pick<NutritionCheckIn, "weightLb" | "bodyFatPct">): number {
  return Math.round(c.weightLb * (1 - c.bodyFatPct / 100) * 10) / 10;
}

/**
 * Shaped after the client's real Google-Doc template
 * ("[Client Name] — Nutrition Protocol"): a Weight / Body Fat % / Lean Mass
 * tracking table, a summary, checkbox example meals, healthy fats, a
 * supplement protocol, a post-workout shake recipe, and a hard rule.
 */
export interface NutritionProtocol {
  updatedAt: string;
  coach: string;
  title: string;
  goal: string;
  summary: string;
  exampleMeals: { meal: string; example: string }[];
  healthyFats: string[];
  dailyTargets: { label: string; value: string; hint?: string }[];
  supplements: { name: string; dose: string; timing: string }[];
  postWorkoutShake: string[];
  rule: string;
  gameDay: string[];
  hydration: string;
  notes: string;
  /** Weekly check-in history, oldest → newest. */
  checkIns: NutritionCheckIn[];
}

export const nutritionProtocols: Record<string, NutritionProtocol> = {
  "ath-jordan": {
    updatedAt: at(-10),
    coach: "Coach Clance",
    title: "Nutrition Protocol",
    goal: "Support in-season power output and recovery — maintain 185 lb at current body-fat while keeping game-day energy high.",
    summary:
      "Meat and vegetables — every meal should consist of meat, poultry or fish, vegetables, and a source of healthy fats.",
    exampleMeals: [
      { meal: "Breakfast", example: "Chicken & avocado" },
      { meal: "Lunch", example: "Lamb & vegetables" },
      { meal: "Dinner", example: "Shrimp & vegetables" },
    ],
    healthyFats: ["Olive oil", "Coconut oil", "Tallow"],
    dailyTargets: [
      { label: "Calories", value: "3,400 kcal", hint: "training days" },
      { label: "Protein", value: "185 g", hint: "~1 g / lb bodyweight" },
      { label: "Carbs", value: "420 g", hint: "front-load around training" },
      { label: "Fat", value: "95 g" },
    ],
    supplements: [
      { name: "Multivitamin", dose: "2 caps", timing: "with meals" },
      { name: "Fish oil", dose: "15 g", timing: "per day" },
      { name: "Magnesium glycinate", dose: "3 tablets", timing: "in the evening" },
      { name: "Probiotics", dose: "2 caps", timing: "with meals, 2× daily" },
      { name: "Vitamin D", dose: "5,000 IU", timing: "with breakfast" },
      { name: "Creatine monohydrate", dose: "5 g", timing: "daily, any time" },
    ],
    postWorkoutShake: ["60 g whey protein", "40 g glutamine", "5 g glycine"],
    rule: "No fruits (or over 50 g of carbohydrates) outside training windows. All supplements as recommended on the bottle.",
    gameDay: [
      "Game -3 h: full meal — chicken + rice + vegetables.",
      "Game -1 h: fruit + sports drink, sip don't chug.",
      "Between periods: diluted sports drink only.",
      "Post-game: shake immediately, full meal within 90 min.",
    ],
    hydration: "Minimum 3.5 L/day (about 120 oz). Add electrolytes on double-session and game days. Urine check: pale straw.",
    notes: "No new supplements without checking with the coaching staff first. Weigh-in Mondays, fasted. Flag any appetite dips during exam weeks.",
    checkIns: [
      { date: at(-28), weightLb: 189.2, bodyFatPct: 12.8 },
      { date: at(-21), weightLb: 188.0, bodyFatPct: 12.4 },
      { date: at(-14), weightLb: 186.8, bodyFatPct: 11.9 },
      { date: at(-7), weightLb: 185.9, bodyFatPct: 11.5 },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Round 3 — analytics helpers (C21/C22) + client-queue teams (C12)    */
/* ------------------------------------------------------------------ */

/** A derived rep-max PR — rendered "365 lb × 3 · Jun 9, 2026" (A4/C21). */
export interface RepMaxPr {
  reps: number;
  weight: number;
  unit: string;
  date: string;
}

const REP_MAX_TARGETS = [1, 2, 3, 5, 10];

/**
 * Best 1/2/3/5/10-rep maxes for a lift, derived from logged tested sets.
 * A set of N reps proves every rep-max at or below N, so each target takes
 * the heaviest set of ≥ that rep count; ties prefer the set closest to the
 * target rep count, then the most recent date. Defaults to Jordan — the
 * demo athlete with a year of history.
 */
export function prsByRepMax(
  lift: string,
  athleteId = "ath-jordan",
): RepMaxPr[] {
  const points = liftHistory[athleteId]?.[lift] ?? [];
  const out: RepMaxPr[] = [];
  for (const target of REP_MAX_TARGETS) {
    let best: LiftPoint | null = null;
    for (const p of points) {
      if (p.reps < target) continue;
      const wins =
        !best ||
        p.weight > best.weight ||
        (p.weight === best.weight &&
          (p.reps < best.reps ||
            (p.reps === best.reps && p.date > best.date)));
      if (wins) best = p;
    }
    if (best) {
      out.push({
        reps: target,
        weight: best.weight,
        unit: best.unit,
        date: best.date,
      });
    }
  }
  return out;
}

export interface ComplianceStats {
  /** % of expected bookings (frequencyPerWeek × weeks in range) actually booked. */
  bookingPct: number;
  bookedSessions: number;
  expectedSessions: number;
  /** % of booked sessions whose log was actually filled in. */
  fillPct: number;
  /** ISO timestamp of the athlete's last activity. */
  lastLogin: string;
  /** Most recent session on the books (can be upcoming); null = none scheduled. */
  lastScheduled: string | null;
}

/** Tiny deterministic hash — stable per-range variation without Math.random. */
function seedFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return h;
}

/**
 * Booking / fill-in compliance for one athlete over a date range (C22).
 * Deterministic: derived from the athlete's attendance, program compliance
 * and scheduled-session roster — the same range always gives the same numbers.
 */
export function complianceStats(
  athleteId: string,
  fromMs: number,
  toMs: number,
): ComplianceStats {
  const a = athleteById(athleteId);
  const spanDays = Math.max(1, Math.round((toMs - fromMs) / 86_400_000));
  if (!a) {
    return {
      bookingPct: 0,
      bookedSessions: 0,
      expectedSessions: 0,
      fillPct: 0,
      lastLogin: new Date(0).toISOString(),
      lastScheduled: null,
    };
  }
  const weeks = Math.max(1, spanDays / 7);
  const expectedSessions = Math.max(1, Math.round(a.frequencyPerWeek * weeks));
  const seed = seedFor(`${athleteId}:${spanDays}`);
  // Booking rate tracks attendance with a small stable per-range wobble.
  const bookRate = Math.min(100, Math.max(35, a.attendancePct + ((seed % 9) - 4)));
  const bookedSessions = Math.min(
    expectedSessions,
    Math.max(0, Math.round((expectedSessions * bookRate) / 100)),
  );
  const bookingPct = Math.round((bookedSessions / expectedSessions) * 100);
  const fillPct = Math.min(
    100,
    Math.max(0, a.program.compliancePct + ((seed % 7) - 3)),
  );
  const scheduled = sessions
    .filter((s) => s.roster.some((r) => r.athleteId === athleteId))
    .map((s) => s.startsAt)
    .sort();
  return {
    bookingPct,
    bookedSessions,
    expectedSessions,
    fillPct,
    lastLogin: a.lastActive,
    lastScheduled: scheduled.length > 0 ? scheduled[scheduled.length - 1] : null,
  };
}

/** Master template whose name matches a group's program — team-row CTA target (C12). */
export function templateForProgramName(
  name: string,
): ProgramTemplate | undefined {
  return programTemplates.find((t) => t.name === name);
}

/** Training phase per group (C13) — shown as a pill on the client-queue team rows. */
export const groupPhase: Record<string, string> = {
  "grp-golf": "Phase 2",
  "grp-track": "Block A",
  "grp-tigers": "Phase 1",
};
