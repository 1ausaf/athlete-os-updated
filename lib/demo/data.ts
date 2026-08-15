/**
 * Self-contained demo dataset for the LPS Athletic AOS.
 *
 * This module is the single source of truth for the runnable demo. It replaces
 * the Supabase-backed `lib/data/*` reads so the app renders instantly with rich,
 * realistic content and can be viewed as an athlete, coach, or owner.
 *
 * Dates are generated relative to a base "now" captured at module load so the
 * schedule always looks current.
 */

const NOW = new Date();

/** ISO string offset from now by whole days + optional hour-of-day override. */
export function at(dayOffset: number, hour?: number, minute = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  if (hour != null) d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type DemoRole = "athlete" | "coach" | "owner" | "parent";

export type BillingState = "paid" | "overdue" | "grace" | "pending";
export type BookingState =
  | "confirmed"
  | "pending"
  | "waitlisted"
  | "available"
  | "completed";
export type Season = "in-season" | "off-season";

export interface MemberNote {
  id: string;
  date: string;
  coach: string;
  /** Rich-text HTML body (bold/italic/lists/headings/highlight). */
  body: string;
}

export interface Pr {
  id: string;
  lift: string;
  value: number;
  unit: "lb" | "kg" | "in" | "s";
  /** Rep count for the max — a lift can hold a 1RM, 3RM, 5RM… (omit for jumps/sprints). */
  reps?: number;
  date: string;
  isNew?: boolean;
}

export interface Guardian {
  name: string;
  relation: string;
  email: string;
}

/**
 * Self-service athlete profile (round 3): contact details, socials and
 * recruiting links the athlete maintains — the coach card prepopulates
 * from this instead of staff re-typing it into Trello.
 */
export interface AthleteProfile {
  athleteId: string;
  /** Separate first/last names (round 5 — "first name and last name, that way
   *  it's easier"). */
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    region: string;
    postal: string;
    /** Round 5: "we're missing province/state and country". */
    country: string;
  };
  instagram?: string;
  twitter?: string;
  /** HUDL recruiting profile URL. */
  hudl?: string;
  /** Full date of birth (ISO). */
  dob: string;
  /** Preferred load unit — the logger defaults to this (round 5). */
  preferredUnit: "lb" | "kg";
  guardian?: { name: string; relation: string; phone: string; email: string };
  emergencyContact?: { name: string; relation: string; phone: string };
}

/** A parent login that manages one or more kids' accounts. Round 5: parents
 *  carry their OWN profile (photo, contacts) — it feeds the card contact info
 *  and the minors' parent sections auto-fill from it. */
export interface ParentAccount {
  id: string;
  name: string;
  initials: string;
  hue: number;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    region: string;
    postal: string;
    country: string;
  };
  relation: string;
  childAthleteIds: string[];
  notifications: { push: boolean; email: boolean };
}

/** Membership type — how the athlete trains with LPS (round 4: pure type,
 *  no longer a board column; lifecycle lives on `status`). */
export type MemberBucket = "in-gym" | "private" | "program-only" | "online";

export const bucketLabel: Record<MemberBucket, string> = {
  "in-gym": "In-gym",
  private: "Private 1-on-1",
  "program-only": "Program only",
  online: "Online",
};

/**
 * Member lifecycle (round 5 — "there's no need for away; they're either
 * active, paused or inactive"):
 * - active   — training normally.
 * - paused   — membership on hold (seasonal break, injury, retention hold).
 *              Can still log in; no programs run. Follow-up date drives the
 *              sales / retention call.
 * - inactive — account disabled (no login), record kept. Deletable when the
 *              record should be removed entirely.
 */
export type AthleteStatus = "active" | "paused" | "inactive";

export const statusLabel: Record<AthleteStatus, string> = {
  active: "Active",
  paused: "Paused",
  inactive: "Inactive",
};

export interface Athlete {
  id: string;
  slug: string;
  name: string;
  initials: string;
  hue: number;
  sport: string;
  age: number;
  isMinor: boolean;
  yearOfBirth: number;
  gender: "M" | "F";
  /** Membership type (in-gym / private / program-only / online). */
  bucket: MemberBucket;
  /** Lifecycle status — drives the members list tabs (round 4). */
  status: AthleteStatus;
  /** Follow-up due date for away/paused members (sales & retention). */
  followUpDate?: string;
  /** Days of published program remaining — 0 means a program update is due now. */
  programDueInDays: number;
  /** Nutrition protocol tier (round 5: None / Standard / Pro). */
  nutrition: "pro" | "standard" | "none";
  coach: string;
  planName: string;
  frequency: string;
  frequencyPerWeek: number;
  bookedThisWeek: number;
  billing: {
    state: BillingState;
    amountDueCents: number;
    nextInvoice: string;
  };
  program: {
    name: string;
    day: number;
    totalDays: number;
    phase: string;
    block: string;
    compliancePct: number;
  };
  attendancePct: number;
  injuryFlags: string[];
  /** Round 6 (P17): "PAST INJURIES" paragraph on Goals & Medical History. */
  pastInjuries?: string;
  /** Round 6 (P17): "CURRENT INJURIES / LIMITATIONS" — feeds the Huddle Brief. */
  currentLimitations?: string;
  season: Season;
  reminders: string[];
  guardians: Guardian[];
  lastActive: string;
  notes: MemberNote[];
  prs: Pr[];
}

export interface RosterEntry {
  athleteId: string;
  state: BookingState;
}

export interface TrainingSession {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  coach: string;
  /** Round 6 (S4): every coach working the session — rows show the avatars.
   *  `coach` stays the lead. */
  coaches?: string[];
  location: string;
  capacity: number;
  roster: RosterEntry[];
  waitlist: string[];
}

export type MessageRole = "coach" | "athlete" | "guardian" | "admin";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: MessageRole;
  body: string;
  at: string;
}

export interface ThreadParticipant {
  id: string;
  name: string;
  role: MessageRole;
  isMinor?: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  kind: "direct" | "broadcast";
  involvesMinor: boolean;
  participants: ThreadParticipant[];
  messages: Message[];
  unread: number;
  updatedAt: string;
}

/** Billing cadence for membership plans (round 5 — "every 1–6 weeks, monthly,
 *  every 2–3 months, quarterly, yearly"). */
export const PLAN_CADENCES = [
  "Every week",
  "Every 2 weeks",
  "Every 3 weeks",
  "Every 4 weeks",
  "Every 5 weeks",
  "Every 6 weeks",
  "Monthly",
  "Every 2 months",
  "Every 3 months",
  "Quarterly",
  "Yearly",
] as const;

export interface Plan {
  id: string;
  name: string;
  priceCents: number;
  frequency: string;
  sessionsPerPeriod: string;
  period: string;
  /** Billing cadence (round 5 — editable, one of PLAN_CADENCES). */
  cadence: string;
  /** Percent discount applied to the plan price (round 5). */
  discountPct?: number;
  /** Custom one-client plan vs a baseline plan offered to everyone. */
  customFor?: string;
  access: string;
  activeMembers: number;
  popular?: boolean;
}

export interface Invoice {
  id: string;
  athleteId: string;
  athleteName: string;
  plan: string;
  amountCents: number;
  /** Round 10 (R45): the audit trail — issue date alongside due date. */
  issuedAt: string;
  dueDate: string;
  status:
    | "paid"
    | "due"
    | "overdue"
    | "upcoming"
    | "canceled"
    | "partial"
    | "refunded";
  method: "Square" | "Cash" | "Card on file";
  /** Stamped when the invoice is resolved (paid or canceled) — R45. */
  paidAt?: string;
  canceledAt?: string;
  /** How it was paid (chosen at mark-paid time) — R47. */
  paidMethod?: string;
  /** Partial payments (R48): amount received so far. */
  paidAmountCents?: number;
  /** Refunds (R49): amount refunded. */
  refundedCents?: number;
}

/** Payment methods offered when marking an invoice paid (round 10, R47). */
export const PAYMENT_METHODS = [
  "Square",
  "Credit / debit card",
  "Cash",
  "Cheque",
  "Other",
] as const;

export interface ComplianceRow {
  threadId: string;
  athlete: string;
  adults: string[];
  guardianPresent: boolean;
  secondCoachPresent: boolean;
  status: "ok" | "gap";
  note: string;
}

/* ------------------------------------------------------------------ */
/* Athletes                                                            */
/* ------------------------------------------------------------------ */

export const athletes: Athlete[] = [
  {
    id: "ath-jordan",
    slug: "jordan-vega",
    name: "Jordan Vega",
    initials: "JV",
    hue: 8,
    sport: "Hockey",
    age: 19,
    isMinor: false,
    yearOfBirth: 2007,
    gender: "M",
    bucket: "in-gym",
    status: "active",
    programDueInDays: 6,
    nutrition: "pro",
    coach: "Coach Ellis",
    planName: "Pro Track — 3×/week",
    frequency: "3×/week",
    frequencyPerWeek: 3,
    bookedThisWeek: 2,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(12) },
    program: {
      name: "In-Season Power — Block C",
      day: 14,
      totalDays: 20,
      phase: "Realization",
      block: "Block C",
      compliancePct: 92,
    },
    attendancePct: 94,
    injuryFlags: [],
    pastInjuries: "Right scapular strain (2025) — resolved after an 8-week pull-emphasis block. Mild ankle sprain, hockey (2024).",
    season: "in-season",
    reminders: ["Birthday in 3 days", "Signed pro tryout invite — acknowledge"],
    guardians: [],
    lastActive: at(0, 8, 12),
    notes: [
      {
        id: "cap-jv-1",
        date: at(-2, 17),
        coach: "Coach Ellis",
        body:
          "<p>Upper hinge day. Right scap control improving, no pain. Held trap-bar at RPE 8, added 2 back-off sets of rows.</p><p><strong>Next:</strong> Progress to 3ct pause next session; retest grip endurance Fri.</p>",
      },
      {
        id: "cap-jv-2",
        date: at(-5, 17),
        coach: "Coach Ellis",
        body:
          "<p>Reported tight left hip after game travel. Extended warm-up, capped lower volume, mobility circuit.</p><p><strong>Next:</strong> Monitor hip; green to resume normal loading if symptom-free.</p>",
      },
      {
        id: "cap-jv-3",
        date: at(-9, 17),
        coach: "Coach Nadia",
        body:
          "<p>Return from road trip, sleep down to ~6h. Auto-regulated to RPE 7 cap, emphasized breathing resets.</p><p><strong>Next:</strong> Re-establish sleep routine; check readiness Monday.</p>",
      },
    ],
    prs: [
      { id: "pr-jv-1", lift: "Trap-bar deadlift", value: 385, unit: "lb", reps: 1, date: at(-2), isNew: true },
      { id: "pr-jv-1b", lift: "Trap-bar deadlift", value: 365, unit: "lb", reps: 3, date: at(-15) },
      { id: "pr-jv-2", lift: "Broad jump", value: 112, unit: "in", date: at(-16) },
      { id: "pr-jv-3", lift: "Bench press", value: 245, unit: "lb", reps: 1, date: at(-30) },
      { id: "pr-jv-3b", lift: "Bench press", value: 225, unit: "lb", reps: 5, date: at(-44) },
      { id: "pr-jv-3c", lift: "Bench press", value: 205, unit: "lb", reps: 10, date: at(-71) },
    ],
  },
  {
    id: "ath-maya",
    slug: "maya-okafor",
    name: "Maya Okafor",
    initials: "MO",
    hue: 268,
    sport: "Basketball",
    age: 16,
    isMinor: true,
    yearOfBirth: 2010,
    gender: "F",
    bucket: "in-gym",
    status: "active",
    programDueInDays: 18,
    nutrition: "standard",
    coach: "Coach Ellis",
    planName: "Academy — 4×/week",
    frequency: "4×/week",
    frequencyPerWeek: 4,
    bookedThisWeek: 3,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(6) },
    program: {
      name: "Off-Season Hypertrophy — Block A",
      day: 6,
      totalDays: 24,
      phase: "Accumulation",
      block: "Block A",
      compliancePct: 88,
    },
    attendancePct: 91,
    injuryFlags: ["Return-to-play wk 2 — bilateral landings only"],
    pastInjuries: "Left ankle sprain, Grade II (Feb 2026) — cleared for full-court play in April.",
    currentLimitations: "Return-to-play week 2: bilateral landings only, no reactive single-leg plyos yet.",
    season: "off-season",
    reminders: ["Parent requested check-in after session"],
    guardians: [
      { name: "Diane Okafor", relation: "Mother", email: "diane.okafor@example.com" },
      { name: "Marcus Okafor", relation: "Father", email: "marcus.okafor@example.com" },
    ],
    lastActive: at(0, 7, 40),
    notes: [
      {
        id: "cap-mo-1",
        date: at(-1, 16),
        coach: "Coach Ellis",
        body:
          "<p>RTP week 2 post ankle sprain. Confident, no swelling. Bilateral landing progressions, no cutting yet.</p><p><strong>Next:</strong> Introduce sub-max unilateral next week if pain-free.</p>",
      },
      {
        id: "cap-mo-2",
        date: at(-4, 16),
        coach: "Coach Nadia",
        body:
          "<p>First week back. Nervous about ankle. Reassurance + isometrics, kept RPE ≤6.</p><p><strong>Next:</strong> Build confidence with tempo work.</p>",
      },
    ],
    prs: [
      { id: "pr-mo-1", lift: "Vertical jump", value: 27, unit: "in", date: at(-40) },
      { id: "pr-mo-2", lift: "Back squat", value: 175, unit: "lb", date: at(-52) },
    ],
  },
  {
    // Maya's younger brother — managed through Diane's parent login (A1).
    id: "ath-noah",
    slug: "noah-okafor",
    name: "Noah Okafor",
    initials: "NO",
    hue: 292,
    sport: "Basketball",
    age: 11,
    isMinor: true,
    yearOfBirth: 2015,
    gender: "M",
    bucket: "in-gym",
    status: "active",
    programDueInDays: 12,
    nutrition: "none",
    coach: "Coach Nadia",
    planName: "Academy Juniors — 2×/week",
    frequency: "2×/week",
    frequencyPerWeek: 2,
    bookedThisWeek: 1,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(9) },
    program: {
      name: "Youth Foundations — Block A",
      day: 4,
      totalDays: 16,
      phase: "Accumulation",
      block: "Block A",
      compliancePct: 81,
    },
    attendancePct: 88,
    injuryFlags: [],
    season: "off-season",
    reminders: [],
    guardians: [
      { name: "Diane Okafor", relation: "Mother", email: "diane.okafor@example.com" },
      { name: "Marcus Okafor", relation: "Father", email: "marcus.okafor@example.com" },
    ],
    lastActive: at(-1, 17, 5),
    notes: [
      {
        id: "note-no-1",
        date: at(-3, 17),
        coach: "Coach Nadia",
        body:
          "<p>Great listener, movement quality ahead of his age group. Kept everything bodyweight + med ball.</p><p><strong>Next:</strong> Introduce dowel work for hinge patterning.</p>",
      },
    ],
    prs: [
      { id: "pr-no-1", lift: "Broad jump", value: 64, unit: "in", date: at(-21) },
      { id: "pr-no-2", lift: "Vertical jump", value: 14, unit: "in", date: at(-21) },
    ],
  },
  {
    id: "ath-dre",
    slug: "andre-santos",
    name: "Andre Santos",
    initials: "AS",
    hue: 190,
    sport: "Football",
    age: 17,
    isMinor: true,
    yearOfBirth: 2009,
    gender: "M",
    bucket: "in-gym",
    status: "active",
    programDueInDays: 0,
    nutrition: "none",
    coach: "Coach Ellis",
    planName: "Academy — 4×/week",
    frequency: "4×/week",
    frequencyPerWeek: 4,
    bookedThisWeek: 4,
    billing: { state: "overdue", amountDueCents: 32000, nextInvoice: at(-4) },
    program: {
      name: "Speed & Power — Block B",
      day: 9,
      totalDays: 18,
      phase: "Intensification",
      block: "Block B",
      compliancePct: 76,
    },
    attendancePct: 82,
    injuryFlags: [],
    pastInjuries: "Hamstring pull, right (spring 2025) — full sprint volumes since August.",
    season: "off-season",
    reminders: ["Membership payment 4 days overdue — booking paused"],
    guardians: [
      { name: "Paulo Santos", relation: "Father", email: "paulo.santos@example.com" },
    ],
    lastActive: at(-1, 18, 5),
    notes: [
      {
        id: "cap-as-1",
        date: at(-3, 18),
        coach: "Coach Ellis",
        body:
          "<p>Sharp acceleration work. Missed last session (no-show). Block clearance drills, flagged attendance dip.</p><p><strong>Next:</strong> Reconnect on consistency; confirm payment with front desk.</p>",
      },
    ],
    prs: [
      { id: "pr-as-1", lift: "40yd dash", value: 4.61, unit: "s", date: at(-20), isNew: true },
      { id: "pr-as-2", lift: "Power clean", value: 205, unit: "lb", date: at(-33) },
    ],
  },
  {
    id: "ath-sofia",
    slug: "sofia-linden",
    name: "Sofia Lindén",
    initials: "SL",
    hue: 330,
    sport: "Soccer",
    age: 22,
    isMinor: false,
    yearOfBirth: 2004,
    gender: "F",
    bucket: "online",
    status: "active",
    programDueInDays: 5,
    nutrition: "none",
    coach: "Coach Nadia",
    planName: "Pro Track — 3×/week",
    frequency: "3×/week",
    frequencyPerWeek: 3,
    bookedThisWeek: 3,
    billing: { state: "grace", amountDueCents: 0, nextInvoice: at(1) },
    program: {
      name: "In-Season Maintenance — Block C",
      day: 11,
      totalDays: 16,
      phase: "Realization",
      block: "Block C",
      compliancePct: 96,
    },
    attendancePct: 98,
    injuryFlags: [],
    season: "in-season",
    reminders: ["Nominated conference player of the week"],
    guardians: [],
    lastActive: at(0, 6, 55),
    notes: [
      {
        id: "cap-sl-1",
        date: at(-1, 7),
        coach: "Coach Nadia",
        body:
          "<p>Match +1 day. Legs heavy but moving well. Deload lower, full-body flush + core.</p><p><strong>Next:</strong> Normal loading resumes match +2.</p>",
      },
    ],
    prs: [
      { id: "pr-sl-1", lift: "Nordic hamstring", value: 6, unit: "s", date: at(-12) },
      { id: "pr-sl-2", lift: "Trap-bar deadlift", value: 275, unit: "lb", date: at(-25) },
    ],
  },
  {
    id: "ath-ty",
    slug: "tyler-brooks",
    name: "Tyler Brooks",
    initials: "TB",
    hue: 40,
    sport: "Baseball",
    age: 15,
    isMinor: true,
    yearOfBirth: 2011,
    gender: "M",
    bucket: "in-gym",
    status: "active",
    programDueInDays: 16,
    nutrition: "none",
    coach: "Coach Ellis",
    planName: "Academy — 2×/week",
    frequency: "2×/week",
    frequencyPerWeek: 2,
    bookedThisWeek: 2,
    billing: { state: "pending", amountDueCents: 0, nextInvoice: at(3) },
    program: {
      name: "Arm Care & Rotational — Block A",
      day: 4,
      totalDays: 20,
      phase: "Accumulation",
      block: "Block A",
      compliancePct: 84,
    },
    attendancePct: 89,
    injuryFlags: ["Throwing volume cap — coach sign-off required"],
    pastInjuries: "UCL irritation, throwing elbow (2025 season) — rehabbed, no surgery.",
    currentLimitations: "Throwing volume cap in effect — overhead pressing stays light, coach sign-off before any max-effort throws.",
    season: "off-season",
    reminders: [],
    guardians: [
      { name: "Rachel Brooks", relation: "Mother", email: "rachel.brooks@example.com" },
    ],
    lastActive: at(-2, 17, 20),
    notes: [
      {
        id: "cap-tb-1",
        date: at(-2, 17),
        coach: "Coach Ellis",
        body:
          "<p>Rotational power focus. Great intent on med-ball work. Kept throwing volume conservative per arm-care plan.</p><p><strong>Next:</strong> Progress rotational MB load; monitor elbow.</p>",
      },
    ],
    prs: [
      { id: "pr-tb-1", lift: "Rotational MB throw", value: 34, unit: "in", date: at(-15) },
    ],
  },
  {
    id: "ath-ren",
    slug: "ren-tanaka",
    name: "Ren Tanaka",
    initials: "RT",
    hue: 150,
    sport: "Olympic WL",
    age: 24,
    isMinor: false,
    yearOfBirth: 2002,
    gender: "M",
    bucket: "private",
    status: "active",
    programDueInDays: 4,
    nutrition: "pro",
    coach: "Coach Nadia",
    planName: "Elite — Unlimited",
    frequency: "5×/week",
    frequencyPerWeek: 5,
    bookedThisWeek: 4,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(20) },
    program: {
      name: "Peaking — Block C",
      day: 17,
      totalDays: 21,
      phase: "Peaking",
      block: "Block C",
      compliancePct: 99,
    },
    attendancePct: 97,
    injuryFlags: [],
    season: "in-season",
    reminders: ["National qualifier in 9 days"],
    guardians: [],
    lastActive: at(0, 9, 5),
    notes: [
      {
        id: "cap-rt-1",
        date: at(-1, 9),
        coach: "Coach Nadia",
        body:
          "<p>Snatch technical session. Bar path clean at 85%. Worked openers, kept volume low for taper.</p><p><strong>Next:</strong> Openers confirmed; light movement day before meet.</p>",
      },
    ],
    prs: [
      { id: "pr-rt-1", lift: "Snatch", value: 130, unit: "kg", date: at(-8), isNew: true },
      { id: "pr-rt-2", lift: "Clean & jerk", value: 162, unit: "kg", date: at(-22) },
    ],
  },
  {
    id: "ath-priya",
    slug: "priya-nair",
    name: "Priya Nair",
    initials: "PN",
    hue: 300,
    sport: "Volleyball",
    age: 18,
    isMinor: false,
    yearOfBirth: 2008,
    gender: "F",
    bucket: "in-gym",
    status: "paused",
    followUpDate: at(14),
    programDueInDays: 21,
    nutrition: "none",
    coach: "Coach Ellis",
    planName: "Pro Track — 3×/week",
    frequency: "3×/week",
    frequencyPerWeek: 3,
    bookedThisWeek: 1,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(9) },
    program: {
      name: "Off-Season Strength — Block A",
      day: 3,
      totalDays: 24,
      phase: "Accumulation",
      block: "Block A",
      compliancePct: 70,
    },
    attendancePct: 74,
    injuryFlags: [],
    pastInjuries: "Patellar tendinopathy, left knee (2024) — settled with isometric protocol.",
    currentLimitations: "Knee tendon still reactive on deep loading — keep squat depth to parallel, monitor morning soreness.",
    season: "off-season",
    reminders: ["No note in 16 days — follow up"],
    guardians: [],
    lastActive: at(-6, 19),
    notes: [
      {
        id: "cap-pn-1",
        date: at(-16, 18),
        coach: "Coach Ellis",
        body:
          "<p>Consistent but attendance slipping with school load. Built a 3-day template that fits her schedule.</p><p><strong>Next:</strong> Check in on adherence; consider 2×/week plan if needed.</p>",
      },
    ],
    prs: [
      { id: "pr-pn-1", lift: "Approach jump", value: 24, unit: "in", date: at(-45) },
    ],
  },
  {
    id: "ath-leo",
    slug: "leo-martin",
    name: "Leo Martin",
    initials: "LM",
    hue: 220,
    sport: "Golf",
    age: 29,
    isMinor: false,
    yearOfBirth: 1997,
    gender: "M",
    bucket: "program-only",
    status: "active",
    programDueInDays: 10,
    nutrition: "pro",
    coach: "Coach Nadia",
    planName: "Executive — 2×/week",
    frequency: "2×/week",
    frequencyPerWeek: 2,
    bookedThisWeek: 2,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(14) },
    program: {
      name: "Rotational Power — Block B",
      day: 8,
      totalDays: 18,
      phase: "Intensification",
      block: "Block B",
      compliancePct: 90,
    },
    attendancePct: 88,
    injuryFlags: [],
    season: "in-season",
    reminders: [],
    guardians: [],
    lastActive: at(-1, 12),
    notes: [
      {
        id: "cap-lm-1",
        date: at(-15, 12),
        coach: "Coach Nadia",
        body:
          "<p>Anti-rotation + hip speed. Feeling strong. Cable chops, med-ball rotational throws.</p><p><strong>Next:</strong> Add overspeed work; monitor low back.</p>",
      },
    ],
    prs: [{ id: "pr-lm-1", lift: "Rotational MB throw", value: 31, unit: "in", date: at(-18) }],
  },
  {
    // PAUSED (seasonal) — in-season with his junior team until spring; keeps
    // his login, no programs run. Follow-up set for the expected return.
    id: "ath-marcus",
    slug: "marcus-hale",
    name: "Marcus Hale",
    initials: "MH",
    hue: 105,
    sport: "Hockey",
    age: 18,
    isMinor: false,
    yearOfBirth: 2008,
    gender: "M",
    bucket: "in-gym",
    status: "paused",
    followUpDate: at(285),
    programDueInDays: 999,
    nutrition: "none",
    coach: "Coach Ellis",
    planName: "Off-season — returning",
    frequency: "—",
    frequencyPerWeek: 0,
    bookedThisWeek: 0,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(285) },
    program: {
      name: "No active program",
      day: 0,
      totalDays: 0,
      phase: "Paused",
      block: "—",
      compliancePct: 0,
    },
    attendancePct: 0,
    injuryFlags: [],
    season: "in-season",
    reminders: ["Season ends April — follow up in May for summer block"],
    guardians: [],
    lastActive: at(-64, 9),
    notes: [
      {
        id: "note-mh-1",
        date: at(-64, 12),
        coach: "Coach Ellis",
        body:
          "<p>Left for the season — junior A roster spot. Great summer block, trap-bar up 40 lb.</p><p><strong>Next:</strong> Reach out in May to lock the summer slot before tryout season.</p>",
      },
    ],
    prs: [{ id: "pr-mh-1", lift: "Trap-bar deadlift", value: 335, unit: "lb", reps: 1, date: at(-70) }],
  },
  {
    // INACTIVE — moved away last year. Login disabled, record kept.
    id: "ath-elena",
    slug: "elena-brooks",
    name: "Elena Brooks",
    initials: "EB",
    hue: 350,
    sport: "Volleyball",
    age: 20,
    isMinor: false,
    yearOfBirth: 2006,
    gender: "F",
    bucket: "online",
    status: "inactive",
    programDueInDays: 999,
    nutrition: "none",
    coach: "—",
    planName: "—",
    frequency: "—",
    frequencyPerWeek: 0,
    bookedThisWeek: 0,
    billing: { state: "paid", amountDueCents: 0, nextInvoice: at(999) },
    program: {
      name: "No active program",
      day: 0,
      totalDays: 0,
      phase: "Inactive",
      block: "—",
      compliancePct: 0,
    },
    attendancePct: 0,
    injuryFlags: [],
    season: "off-season",
    reminders: [],
    guardians: [],
    lastActive: at(-310, 10),
    notes: [
      {
        id: "note-eb-1",
        date: at(-310, 12),
        coach: "Coach Nadia",
        body:
          "<p>Moved to Vancouver for school — ran the exit checklist, billing canceled, workouts unpublished.</p>",
      },
    ],
    prs: [],
  },
];

export const athleteById = (id: string) => athletes.find((a) => a.id === id);

/** Sport-specific training goal per athlete (the Trello-card "GOALS" line). */
/* ------------------------------------------------------------------ */
/* Athlete profiles — self-maintained contact/socials (A20, feeds C6)  */
/* ------------------------------------------------------------------ */

export const athleteProfiles: Record<string, AthleteProfile> = {
  "ath-jordan": {
    athleteId: "ath-jordan",
    firstName: "Jordan",
    lastName: "Vega",
    email: "jordan.vega@lpsathletic.com",
    phone: "+1 (647) 555-0148",
    address: { street: "48 Maplewood Ave", city: "North York", region: "ON", postal: "M2N 5X9", country: "Canada" },
    instagram: "@jordanvega_10",
    twitter: "@jvega10",
    hudl: "hudl.com/profile/jordanvega",
    dob: "2007-07-26",
    preferredUnit: "lb",
    emergencyContact: { name: "Elena Vega", relation: "Mother", phone: "+1 (647) 555-0121" },
  },
  "ath-maya": {
    athleteId: "ath-maya",
    firstName: "Maya",
    lastName: "Okafor",
    email: "maya.okafor@example.com",
    phone: "+1 (416) 555-0192",
    address: { street: "12 Birchmount Rd", city: "Scarborough", region: "ON", postal: "M1N 3J4", country: "Canada" },
    instagram: "@maya.hoops",
    hudl: "hudl.com/profile/mayaokafor",
    dob: "2010-03-14",
    preferredUnit: "lb",
    guardian: { name: "Diane Okafor", relation: "Mother", phone: "+1 (416) 555-0177", email: "diane.okafor@example.com" },
    emergencyContact: { name: "Diane Okafor", relation: "Mother", phone: "+1 (416) 555-0177" },
  },
  "ath-noah": {
    athleteId: "ath-noah",
    firstName: "Noah",
    lastName: "Okafor",
    email: "diane.okafor@example.com",
    phone: "+1 (416) 555-0177",
    address: { street: "12 Birchmount Rd", city: "Scarborough", region: "ON", postal: "M1N 3J4", country: "Canada" },
    dob: "2015-09-02",
    preferredUnit: "lb",
    guardian: { name: "Diane Okafor", relation: "Mother", phone: "+1 (416) 555-0177", email: "diane.okafor@example.com" },
    emergencyContact: { name: "Diane Okafor", relation: "Mother", phone: "+1 (416) 555-0177" },
  },
  "ath-dre": {
    athleteId: "ath-dre",
    firstName: "Andre",
    lastName: "Santos",
    email: "andre.santos@example.com",
    phone: "+1 (905) 555-0163",
    address: { street: "203 Weston Rd", city: "Toronto", region: "ON", postal: "M6N 4Z4", country: "Canada" },
    instagram: "@dre.santos7",
    hudl: "hudl.com/profile/andresantos",
    dob: "2009-11-30",
    preferredUnit: "lb",
    guardian: { name: "Paulo Santos", relation: "Father", phone: "+1 (905) 555-0114", email: "paulo.santos@example.com" },
    emergencyContact: { name: "Paulo Santos", relation: "Father", phone: "+1 (905) 555-0114" },
  },
};

export function athleteProfileById(id: string): AthleteProfile | undefined {
  return athleteProfiles[id];
}

/** Parent logins — each manages one or more kids (A1). Round 5: parents have
 *  their own profile that feeds the kids' parent-info sections. */
export const parentAccounts: ParentAccount[] = [
  {
    id: "parent-diane",
    name: "Diane Okafor",
    initials: "DO",
    hue: 262,
    email: "diane.okafor@example.com",
    phone: "+1 (416) 555-0177",
    address: {
      street: "12 Birchmount Rd",
      city: "Scarborough",
      region: "ON",
      postal: "M1N 3J4",
      country: "Canada",
    },
    relation: "Mother",
    childAthleteIds: ["ath-maya", "ath-noah"],
    notifications: { push: true, email: true },
  },
  {
    // Round 7: BOTH parents can manage the same kids — Marcus sits in the
    // same chats and gets the same notifications.
    id: "parent-marcus",
    name: "Marcus Okafor",
    initials: "MO",
    hue: 226,
    email: "marcus.okafor@example.com",
    phone: "+1 (416) 555-0179",
    address: {
      street: "12 Birchmount Rd",
      city: "Scarborough",
      region: "ON",
      postal: "M1N 3J4",
      country: "Canada",
    },
    relation: "Father",
    childAthleteIds: ["ath-maya", "ath-noah"],
    notifications: { push: true, email: true },
  },
];

/** Every parent managing a given child (round 7 — multi-parent support). */
export function parentsOfAthlete(athleteId: string): ParentAccount[] {
  return parentAccounts.filter((p) => p.childAthleteIds.includes(athleteId));
}

export function parentAccountById(id: string): ParentAccount | undefined {
  return parentAccounts.find((p) => p.id === id);
}

/** Days since the last coach note — the members-list "Last commented" column
 *  (round 5: replaces the inactivity digest). 999 = never. */
export function daysSinceLastNote(a: Athlete): number {
  const last = a.notes[0]?.date;
  if (!last) return 999;
  return Math.max(
    0,
    Math.floor((new Date(NOW).getTime() - new Date(last).getTime()) / 86_400_000),
  );
}

/** Program-due date derived from the runway counter (round 5: coaches pick a
 *  DATE, the days-remaining chip is derived). */
export function programDueDate(a: Athlete): string {
  return at(Math.min(a.programDueInDays, 365));
}

export const athleteGoals: Record<string, string> = {
  "ath-jordan": "Improve explosiveness and top-end speed for pro tryouts.",
  "ath-maya":
    "Return to full-court play post-ankle and add 2 inches to the vertical.",
  "ath-dre": "Break a 4.5s 40 and add lean mass before senior season.",
  "ath-sofia":
    "Hold match-day power output through the full season — zero soft-tissue flags.",
  "ath-ty": "Build rotational power while keeping the throwing arm healthy.",
  "ath-ren": "Hit a 295 kg total at the national qualifier.",
  "ath-priya":
    "Rebuild training consistency and add 2 inches to the approach jump before club season.",
  "ath-leo": "Add 10 yards of driver carry without low-back flare-ups.",
};
export const athleteBySlug = (slug: string) =>
  athletes.find((a) => a.slug === slug);

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export const sessions: TrainingSession[] = [
  {
    id: "sess-1",
    title: "Semi-Private — Power",
    type: "Semi-Private",
    startsAt: at(0, 16),
    endsAt: at(0, 17, 30),
    coach: "Coach Ellis",
    coaches: ["Coach Ellis", "Coach Mason"],
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-jordan", state: "confirmed" },
      { athleteId: "ath-maya", state: "confirmed" },
      { athleteId: "ath-priya", state: "pending" },
      { athleteId: "ath-ty", state: "confirmed" },
    ],
    waitlist: ["ath-leo"],
  },
  {
    id: "sess-2",
    title: "Semi-Private — Speed",
    type: "Semi-Private",
    startsAt: at(0, 18),
    endsAt: at(0, 19, 30),
    coach: "Coach Nadia",
    location: "Turf · Lanes 1–3",
    capacity: 6,
    roster: [
      { athleteId: "ath-dre", state: "confirmed" },
      { athleteId: "ath-sofia", state: "confirmed" },
      { athleteId: "ath-ren", state: "confirmed" },
    ],
    waitlist: [],
  },
  {
    id: "sess-3",
    title: "Morning Strength",
    type: "Semi-Private",
    startsAt: at(1, 7),
    endsAt: at(1, 8, 30),
    coach: "Coach Ellis",
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-ren", state: "confirmed" },
      { athleteId: "ath-jordan", state: "confirmed" },
      { athleteId: "ath-leo", state: "pending" },
    ],
    waitlist: [],
  },
  {
    id: "sess-4",
    title: "Evening Power",
    type: "Semi-Private",
    startsAt: at(1, 17),
    endsAt: at(1, 18, 30),
    coach: "Coach Nadia",
    location: "Floor A · Racks 5–8",
    capacity: 6,
    roster: [
      { athleteId: "ath-sofia", state: "confirmed" },
      { athleteId: "ath-maya", state: "waitlisted" },
    ],
    waitlist: ["ath-maya"],
  },
  {
    id: "sess-5",
    title: "Morning Strength",
    type: "Semi-Private",
    startsAt: at(2, 7),
    endsAt: at(2, 8, 30),
    coach: "Coach Ellis",
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [{ athleteId: "ath-jordan", state: "confirmed" }],
    waitlist: [],
  },
  // Round 6 (S3): further-out sessions so Today / Weekly / Monthly visibly
  // filter differently.
  {
    id: "sess-6",
    title: "Semi-Private — Power",
    type: "Semi-Private",
    startsAt: at(5, 16),
    endsAt: at(5, 17, 30),
    coach: "Coach Ellis",
    coaches: ["Coach Ellis", "Coach Nadia"],
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-jordan", state: "confirmed" },
      { athleteId: "ath-ty", state: "confirmed" },
    ],
    waitlist: [],
  },
  {
    id: "sess-7",
    title: "Team Block — Tigers HPP",
    type: "Team",
    startsAt: at(9, 17),
    endsAt: at(9, 18, 30),
    coach: "Coach Clance",
    coaches: ["Coach Clance", "Coach Nadia", "Coach Mason"],
    location: "Turf + Floor B",
    capacity: 14,
    roster: [{ athleteId: "ath-ty", state: "confirmed" }],
    waitlist: [],
  },
  {
    id: "sess-8",
    title: "Weightlifting Team",
    type: "Weightlifting Team",
    startsAt: at(14, 18),
    endsAt: at(14, 20),
    coach: "Coach Clance",
    location: "Platforms 1–6",
    capacity: 8,
    roster: [{ athleteId: "ath-ren", state: "confirmed" }],
    waitlist: [],
  },
];

/** The next upcoming session (used by the coach huddle brief). */
export const nextSession = sessions[0];

/**
 * Session history — coaches can page back through past blocks ("how we can
 * go back in the past sessions"). Roster state "completed" = attended;
 * "pending" here reads as a no-show.
 */
export const pastSessions: TrainingSession[] = [
  {
    // Round 6 (S3): this morning's session — the Past tab's default "Today"
    // window has something to show.
    id: "past-0",
    title: "Early Strength",
    type: "Semi-Private",
    startsAt: at(0, 7),
    endsAt: at(0, 8, 30),
    coach: "Coach Ellis",
    coaches: ["Coach Ellis", "Coach Mason"],
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-ren", state: "completed" },
      { athleteId: "ath-jordan", state: "completed" },
      { athleteId: "ath-leo", state: "pending" },
    ],
    waitlist: [],
  },
  {
    id: "past-1",
    title: "Semi-Private — Power",
    type: "Semi-Private",
    startsAt: at(-1, 16),
    endsAt: at(-1, 17, 30),
    coach: "Coach Ellis",
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-jordan", state: "completed" },
      { athleteId: "ath-maya", state: "completed" },
      { athleteId: "ath-ty", state: "completed" },
      { athleteId: "ath-dre", state: "pending" },
    ],
    waitlist: [],
  },
  {
    id: "past-2",
    title: "Semi-Private — Speed",
    type: "Semi-Private",
    startsAt: at(-1, 18),
    endsAt: at(-1, 19, 30),
    coach: "Coach Nadia",
    location: "Turf · Lanes 1–3",
    capacity: 6,
    roster: [
      { athleteId: "ath-sofia", state: "completed" },
      { athleteId: "ath-ren", state: "completed" },
      { athleteId: "ath-noah", state: "completed" },
    ],
    waitlist: [],
  },
  {
    id: "past-3",
    title: "Semi-Private — Power",
    type: "Semi-Private",
    startsAt: at(-2, 16),
    endsAt: at(-2, 17, 30),
    coach: "Coach Ellis",
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-jordan", state: "completed" },
      { athleteId: "ath-priya", state: "completed" },
      { athleteId: "ath-maya", state: "completed" },
      { athleteId: "ath-leo", state: "completed" },
    ],
    waitlist: [],
  },
  {
    id: "past-4",
    title: "Weightlifting Team",
    type: "Team",
    startsAt: at(-3, 18, 30),
    endsAt: at(-3, 20, 30),
    coach: "Coach Clance",
    location: "Platforms 1–6",
    capacity: 8,
    roster: [
      { athleteId: "ath-ren", state: "completed" },
      { athleteId: "ath-jordan", state: "completed" },
    ],
    waitlist: [],
  },
  {
    id: "past-5",
    title: "Semi-Private — Speed",
    type: "Semi-Private",
    startsAt: at(-4, 18),
    endsAt: at(-4, 19, 30),
    coach: "Coach Nadia",
    location: "Turf · Lanes 1–3",
    capacity: 6,
    roster: [
      { athleteId: "ath-dre", state: "completed" },
      { athleteId: "ath-sofia", state: "pending" },
      { athleteId: "ath-noah", state: "completed" },
      { athleteId: "ath-ty", state: "completed" },
    ],
    waitlist: [],
  },
  {
    id: "past-6",
    title: "Semi-Private — Power",
    type: "Semi-Private",
    startsAt: at(-5, 16),
    endsAt: at(-5, 17, 30),
    coach: "Coach Ellis",
    location: "Floor A · Racks 1–4",
    capacity: 6,
    roster: [
      { athleteId: "ath-jordan", state: "completed" },
      { athleteId: "ath-maya", state: "completed" },
      { athleteId: "ath-ty", state: "completed" },
      { athleteId: "ath-priya", state: "completed" },
      { athleteId: "ath-leo", state: "completed" },
    ],
    waitlist: [],
  },
];

/* ------------------------------------------------------------------ */
/* Messaging + Safe-Sport Rule of Two                                  */
/* ------------------------------------------------------------------ */

export const threads: Thread[] = [
  {
    id: "thread-maya",
    subject: "Maya Okafor",
    kind: "direct",
    involvesMinor: true,
    participants: [
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "ath-maya", name: "Maya Okafor", role: "athlete", isMinor: true },
      { id: "guardian-diane", name: "Diane Okafor", role: "guardian" },
      // Round 7: both parents sit in the same chat.
      { id: "guardian-marcus", name: "Marcus Okafor", role: "guardian" },
    ],
    unread: 2,
    updatedAt: at(0, 8, 10),
    messages: [
      {
        id: "m1",
        senderId: "coach-ellis",
        senderName: "Coach Ellis",
        senderRole: "coach",
        body: "Great session today — ankle looked stable on the bilateral landings. No swelling reported after.",
        at: at(-1, 17, 5),
      },
      {
        id: "m2",
        senderId: "guardian-diane",
        senderName: "Diane Okafor",
        senderRole: "guardian",
        body: "Thank you! She said it felt good. Anything we should watch for tonight?",
        at: at(-1, 19, 30),
      },
      {
        id: "m3",
        senderId: "coach-ellis",
        senderName: "Coach Ellis",
        senderRole: "coach",
        body: "Just ice if there's any soreness and normal sleep. We'll progress to sub-max unilateral next week.",
        at: at(0, 8, 10),
      },
    ],
  },
  {
    id: "thread-jordan",
    subject: "Jordan Vega",
    kind: "direct",
    involvesMinor: false,
    participants: [
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "ath-jordan", name: "Jordan Vega", role: "athlete" },
    ],
    unread: 1,
    updatedAt: at(0, 8, 12),
    messages: [
      {
        id: "j1",
        senderId: "coach-ellis",
        senderName: "Coach Ellis",
        senderRole: "coach",
        body: "That trap-bar 385 is a new PR — logged it. How did the pause reps feel?",
        at: at(-2, 17, 40),
      },
      {
        id: "j2",
        senderId: "ath-jordan",
        senderName: "Jordan Vega",
        senderRole: "athlete",
        body: "Felt strong! Grip was the limiter on the last set. Ready to push next block.",
        at: at(0, 8, 12),
      },
    ],
  },
  // Round 10 (R23): GROUP chats — every group has one thread with its
  // linked members + all its coaches.
  {
    id: "thread-grp-track",
    subject: "Quest Sports Track Club",
    kind: "direct",
    involvesMinor: false,
    participants: [
      { id: "coach-clance", name: "Coach Clance", role: "coach" },
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "coach-nadia", name: "Coach Nadia", role: "coach" },
      { id: "contact-angela", name: "Angela Reyes", role: "guardian" },
    ],
    unread: 1,
    updatedAt: at(0, 7, 45),
    messages: [
      {
        id: "gt1",
        senderId: "coach-clance",
        senderName: "Coach Clance",
        senderRole: "coach",
        body: "Sprint Development Block A wraps next week — testing day Thursday. Every athlete brings spikes.",
        at: at(-2, 18),
      },
      {
        id: "gt2",
        senderId: "contact-angela",
        senderName: "Angela Reyes",
        senderRole: "guardian",
        body: "Thanks coach — the club bus arrives 15 minutes early Thursday, gates open?",
        at: at(0, 7, 45),
      },
    ],
  },
  {
    id: "thread-grp-golf",
    subject: "Sunday Golf Group",
    kind: "direct",
    involvesMinor: false,
    participants: [
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "coach-nadia", name: "Coach Nadia", role: "coach" },
      { id: "ath-leo", name: "Leo Martin", role: "athlete" },
    ],
    unread: 0,
    updatedAt: at(-2, 10),
    messages: [
      {
        id: "gg1",
        senderId: "coach-nadia",
        senderName: "Coach Nadia",
        senderRole: "coach",
        body: "Sunday crew — rotational power day this week. Bring your own glove if you want launch-monitor numbers after.",
        at: at(-2, 10),
      },
    ],
  },
  {
    id: "thread-grp-tigers",
    subject: "Tigers HPP [A]",
    kind: "direct",
    involvesMinor: true,
    participants: [
      { id: "coach-clance", name: "Coach Clance", role: "coach" },
      { id: "coach-nadia", name: "Coach Nadia", role: "coach" },
      { id: "ath-ty", name: "Tyler Brooks", role: "athlete", isMinor: true },
      { id: "contact-rick", name: "Rick Alvarez", role: "guardian" },
    ],
    unread: 0,
    updatedAt: at(-3, 16),
    messages: [
      {
        id: "tg1",
        senderId: "coach-clance",
        senderName: "Coach Clance",
        senderRole: "coach",
        body: "Tigers — arm-care circuit added before every session this block. 10 minutes, non-negotiable.",
        at: at(-3, 16),
      },
    ],
  },
  {
    id: "thread-broadcast",
    subject: "Facility — Holiday hours",
    kind: "broadcast",
    involvesMinor: false,
    participants: [
      { id: "admin-kayla", name: "Kayla Chen", role: "admin" },
      { id: "all", name: "All athletes", role: "athlete" },
    ],
    unread: 0,
    updatedAt: at(-3, 10),
    messages: [
      {
        id: "b1",
        senderId: "admin-kayla",
        senderName: "Kayla Chen",
        senderRole: "admin",
        body: "Heads up team — the floor opens at 8am on the holiday Monday. Book early, spots fill fast. 🐺",
        at: at(-3, 10),
      },
    ],
  },
  {
    id: "thread-andre",
    subject: "Andre Santos",
    kind: "direct",
    involvesMinor: true,
    participants: [
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "ath-dre", name: "Andre Santos", role: "athlete", isMinor: true },
      { id: "guardian-paulo", name: "Paulo Santos", role: "guardian" },
    ],
    unread: 0,
    updatedAt: at(-1, 9),
    messages: [
      {
        id: "a1",
        senderId: "coach-ellis",
        senderName: "Coach Ellis",
        senderRole: "coach",
        body: "Hi Paulo — Andre's been sharp on the field work. Front desk flagged a payment that's a few days past due; booking is paused until it's sorted.",
        at: at(-1, 9),
      },
    ],
  },
];

export const threadById = (id: string) => threads.find((t) => t.id === id);

/* ------------------------------------------------------------------ */
/* Billing / plans / invoices                                         */
/* ------------------------------------------------------------------ */

export const plans: Plan[] = [
  {
    id: "plan-academy",
    name: "Academy",
    priceCents: 26000,
    frequency: "2–4×/week",
    sessionsPerPeriod: "Up to 16 / 4 weeks",
    period: "Every 4 weeks",
    cadence: "Every 4 weeks",
    access: "Semi-private blocks",
    activeMembers: 58,
    popular: true,
  },
  {
    id: "plan-pro",
    name: "Pro Track",
    priceCents: 34000,
    frequency: "3×/week",
    sessionsPerPeriod: "12 / month",
    period: "Monthly",
    cadence: "Monthly",
    access: "Semi-private + performance testing",
    activeMembers: 41,
  },
  {
    id: "plan-elite",
    name: "Elite",
    priceCents: 52000,
    frequency: "Unlimited",
    sessionsPerPeriod: "Unlimited",
    period: "Monthly",
    cadence: "Monthly",
    access: "All blocks + priority booking",
    activeMembers: 12,
  },
  {
    id: "plan-exec",
    name: "Executive",
    priceCents: 30000,
    frequency: "2×/week",
    sessionsPerPeriod: "8 / month",
    period: "Monthly",
    cadence: "Monthly",
    access: "Off-peak semi-private",
    activeMembers: 17,
  },
  {
    // Round 5 (owner video): custom one-client plan with a discount and a
    // non-standard cadence — "create a plan for that specific client".
    id: "plan-quest-custom",
    name: "Team — Quest Track Club",
    priceCents: 190000,
    frequency: "2×/week team blocks",
    sessionsPerPeriod: "8 / month per athlete",
    period: "Quarterly",
    cadence: "Quarterly",
    discountPct: 10,
    customFor: "Quest Sports Track Club",
    access: "Team programming + facility blocks",
    activeMembers: 9,
  },
];

export const invoices: Invoice[] = [
  { id: "inv-1", athleteId: "ath-dre", athleteName: "Andre Santos", plan: "Academy", amountCents: 32000, issuedAt: at(-18), dueDate: at(-4), status: "overdue", method: "Square" },
  { id: "inv-2", athleteId: "ath-sofia", athleteName: "Sofia Lindén", plan: "Pro Track", amountCents: 34000, issuedAt: at(-13), dueDate: at(1), status: "due", method: "Card on file" },
  { id: "inv-3", athleteId: "ath-ty", athleteName: "Tyler Brooks", plan: "Academy", amountCents: 26000, issuedAt: at(-11), dueDate: at(3), status: "upcoming", method: "Square" },
  { id: "inv-4", athleteId: "ath-jordan", athleteName: "Jordan Vega", plan: "Pro Track", amountCents: 34000, issuedAt: at(-15), dueDate: at(-1), status: "paid", paidAt: at(-1), paidMethod: "Square", method: "Card on file" },
  { id: "inv-5", athleteId: "ath-ren", athleteName: "Ren Tanaka", plan: "Elite", amountCents: 52000, issuedAt: at(-16), dueDate: at(-2), status: "paid", paidAt: at(-1), paidMethod: "Square", method: "Square" },
  { id: "inv-6", athleteId: "ath-maya", athleteName: "Maya Okafor", plan: "Academy", amountCents: 26000, issuedAt: at(-8), dueDate: at(6), status: "upcoming", method: "Square" },
  { id: "inv-7", athleteId: "ath-leo", athleteName: "Leo Martin", plan: "Executive", amountCents: 30000, issuedAt: at(-15), dueDate: at(-1), status: "paid", paidAt: at(-1), paidMethod: "Square", method: "Card on file" },
  // Round 5 (P2): Noah's overdue invoice feeds his parent-switcher badge.
  { id: "inv-8", athleteId: "ath-noah", athleteName: "Noah Okafor", plan: "Academy", amountCents: 26000, issuedAt: at(-17), dueDate: at(-3), status: "overdue", method: "Square" },
];

/** 8-week revenue trend (cents), oldest → newest. */
export const revenueTrend = [
  38200, 41100, 39900, 44300, 46800, 45200, 49100, 52400,
].map((v) => v * 100);

/* ------------------------------------------------------------------ */
/* Compliance                                                          */
/* ------------------------------------------------------------------ */

export const complianceRows: ComplianceRow[] = threads
  .filter((t) => t.involvesMinor)
  .map((t) => {
    const adults = t.participants
      .filter((p) => p.role !== "athlete")
      .map((p) => p.name);
    const guardianPresent = t.participants.some((p) => p.role === "guardian");
    const coachCount = t.participants.filter((p) => p.role === "coach").length;
    const secondCoachPresent = coachCount >= 2;
    const compliant = guardianPresent || secondCoachPresent;
    return {
      threadId: t.id,
      athlete: t.participants.find((p) => p.role === "athlete")?.name ?? "—",
      adults,
      guardianPresent,
      secondCoachPresent,
      status: compliant ? "ok" : "gap",
      note: compliant
        ? "Second adult present — Rule of Two satisfied."
        : "Missing second adult — thread blocked until a guardian or coach is added.",
    } satisfies ComplianceRow;
  });

/* ------------------------------------------------------------------ */
/* Derived facility KPIs (owner exec view)                             */
/* ------------------------------------------------------------------ */

export const facility = {
  activeAthletes: 128,
  minorAthletes: 71,
  weeklySessions: 46,
  huddlePrepMins: 2.4,
  bookingCompliancePct: 100,
  ruleOfTwoCoveragePct: 100,
  monthlyRecurringCents: 52400 * 100,
  overdueAccounts: invoices.filter((i) => i.status === "overdue").length,
  logAdherencePct: 73,
};

/* ------------------------------------------------------------------ */
/* Small formatting helpers shared by demo pages                       */
/* ------------------------------------------------------------------ */

export function money(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function money2(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export function fmtDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** Full calendar date for records — "Jul 1, 2026" (PRs show real dates). */
export function fmtFullDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtRange(startIso: string, endIso: string): string {
  return `${fmtDay(startIso)} · ${fmtTime(startIso)}–${fmtTime(endIso)}`;
}

export function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
