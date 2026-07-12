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
function at(dayOffset: number, hour?: number, minute = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  if (hour != null) d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type DemoRole = "athlete" | "coach" | "owner";

export type BillingState = "paid" | "overdue" | "grace" | "pending";
export type BookingState =
  | "confirmed"
  | "pending"
  | "waitlisted"
  | "available"
  | "completed";
export type Season = "in-season" | "off-season";

export interface CapNote {
  id: string;
  date: string;
  coach: string;
  context: string;
  action: string;
  plan: string;
}

export interface Pr {
  id: string;
  lift: string;
  value: number;
  unit: "lb" | "kg" | "in" | "s";
  date: string;
  isNew?: boolean;
}

export interface Guardian {
  name: string;
  relation: string;
  email: string;
}

export interface Athlete {
  id: string;
  slug: string;
  name: string;
  initials: string;
  hue: number;
  sport: string;
  age: number;
  isMinor: boolean;
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
  season: Season;
  reminders: string[];
  guardians: Guardian[];
  lastActive: string;
  capNotes: CapNote[];
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

export interface Plan {
  id: string;
  name: string;
  priceCents: number;
  frequency: string;
  sessionsPerPeriod: string;
  period: string;
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
  dueDate: string;
  status: "paid" | "due" | "overdue" | "upcoming";
  method: "Square" | "Cash" | "Card on file";
}

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
    season: "in-season",
    reminders: ["Birthday in 3 days", "Signed pro tryout invite — acknowledge"],
    guardians: [],
    lastActive: at(0, 8, 12),
    capNotes: [
      {
        id: "cap-jv-1",
        date: at(-2, 17),
        coach: "Coach Ellis",
        context: "Upper hinge day. Right scap control improving, no pain.",
        action: "Held trap-bar at RPE 8, added 2 back-off sets of rows.",
        plan: "Progress to 3ct pause next session; retest grip endurance Fri.",
      },
      {
        id: "cap-jv-2",
        date: at(-5, 17),
        coach: "Coach Ellis",
        context: "Reported tight left hip after game travel.",
        action: "Extended warm-up, capped lower volume, mobility circuit.",
        plan: "Monitor hip; green to resume normal loading if symptom-free.",
      },
      {
        id: "cap-jv-3",
        date: at(-9, 17),
        coach: "Coach Nadia",
        context: "Return from road trip, sleep down to ~6h.",
        action: "Auto-regulated to RPE 7 cap, emphasized breathing resets.",
        plan: "Re-establish sleep routine; check readiness Monday.",
      },
    ],
    prs: [
      { id: "pr-jv-1", lift: "Trap-bar deadlift", value: 385, unit: "lb", date: at(-2), isNew: true },
      { id: "pr-jv-2", lift: "Broad jump", value: 112, unit: "in", date: at(-16) },
      { id: "pr-jv-3", lift: "Bench press", value: 245, unit: "lb", date: at(-30) },
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
    season: "off-season",
    reminders: ["Parent requested check-in after session"],
    guardians: [
      { name: "Diane Okafor", relation: "Mother", email: "diane.okafor@example.com" },
    ],
    lastActive: at(0, 7, 40),
    capNotes: [
      {
        id: "cap-mo-1",
        date: at(-1, 16),
        coach: "Coach Ellis",
        context: "RTP week 2 post ankle sprain. Confident, no swelling.",
        action: "Bilateral landing progressions, no cutting yet.",
        plan: "Introduce sub-max unilateral next week if pain-free.",
      },
      {
        id: "cap-mo-2",
        date: at(-4, 16),
        coach: "Coach Nadia",
        context: "First week back. Nervous about ankle.",
        action: "Reassurance + isometrics, kept RPE ≤6.",
        plan: "Build confidence with tempo work.",
      },
    ],
    prs: [
      { id: "pr-mo-1", lift: "Vertical jump", value: 27, unit: "in", date: at(-40) },
      { id: "pr-mo-2", lift: "Back squat", value: 175, unit: "lb", date: at(-52) },
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
    season: "off-season",
    reminders: ["Membership payment 4 days overdue — booking paused"],
    guardians: [
      { name: "Paulo Santos", relation: "Father", email: "paulo.santos@example.com" },
    ],
    lastActive: at(-1, 18, 5),
    capNotes: [
      {
        id: "cap-as-1",
        date: at(-3, 18),
        coach: "Coach Ellis",
        context: "Sharp acceleration work. Missed last session (no-show).",
        action: "Block clearance drills, flagged attendance dip.",
        plan: "Reconnect on consistency; confirm payment with front desk.",
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
    capNotes: [
      {
        id: "cap-sl-1",
        date: at(-1, 7),
        coach: "Coach Nadia",
        context: "Match +1 day. Legs heavy but moving well.",
        action: "Deload lower, full-body flush + core.",
        plan: "Normal loading resumes match +2.",
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
    season: "off-season",
    reminders: [],
    guardians: [
      { name: "Rachel Brooks", relation: "Mother", email: "rachel.brooks@example.com" },
    ],
    lastActive: at(-2, 17, 20),
    capNotes: [
      {
        id: "cap-tb-1",
        date: at(-2, 17),
        coach: "Coach Ellis",
        context: "Rotational power focus. Great intent on med-ball work.",
        action: "Kept throwing volume conservative per arm-care plan.",
        plan: "Progress rotational MB load; monitor elbow.",
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
    capNotes: [
      {
        id: "cap-rt-1",
        date: at(-1, 9),
        coach: "Coach Nadia",
        context: "Snatch technical session. Bar path clean at 85%.",
        action: "Worked openers, kept volume low for taper.",
        plan: "Openers confirmed; light movement day before meet.",
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
    season: "off-season",
    reminders: ["No CAP note in 12 days — follow up"],
    guardians: [],
    lastActive: at(-6, 19),
    capNotes: [
      {
        id: "cap-pn-1",
        date: at(-12, 18),
        coach: "Coach Ellis",
        context: "Consistent but attendance slipping with school load.",
        action: "Built a 3-day template that fits her schedule.",
        plan: "Check in on adherence; consider 2×/week plan if needed.",
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
    capNotes: [
      {
        id: "cap-lm-1",
        date: at(-2, 12),
        coach: "Coach Nadia",
        context: "Anti-rotation + hip speed. Feeling strong.",
        action: "Cable chops, med-ball rotational throws.",
        plan: "Add overspeed work; monitor low back.",
      },
    ],
    prs: [{ id: "pr-lm-1", lift: "Rotational MB throw", value: 31, unit: "in", date: at(-18) }],
  },
];

export const athleteById = (id: string) => athletes.find((a) => a.id === id);
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
];

/** The next upcoming session (used by the coach huddle brief). */
export const nextSession = sessions[0];

/* ------------------------------------------------------------------ */
/* Messaging + Safe-Sport Rule of Two                                  */
/* ------------------------------------------------------------------ */

export const threads: Thread[] = [
  {
    id: "thread-maya",
    subject: "Maya — RTP check-ins",
    kind: "direct",
    involvesMinor: true,
    participants: [
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "ath-maya", name: "Maya Okafor", role: "athlete", isMinor: true },
      { id: "guardian-diane", name: "Diane Okafor", role: "guardian" },
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
    subject: "Jordan — programming",
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
    subject: "Andre — attendance + billing",
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
    access: "Off-peak semi-private",
    activeMembers: 17,
  },
];

export const invoices: Invoice[] = [
  { id: "inv-1", athleteId: "ath-dre", athleteName: "Andre Santos", plan: "Academy", amountCents: 32000, dueDate: at(-4), status: "overdue", method: "Square" },
  { id: "inv-2", athleteId: "ath-sofia", athleteName: "Sofia Lindén", plan: "Pro Track", amountCents: 34000, dueDate: at(1), status: "due", method: "Card on file" },
  { id: "inv-3", athleteId: "ath-ty", athleteName: "Tyler Brooks", plan: "Academy", amountCents: 26000, dueDate: at(3), status: "upcoming", method: "Square" },
  { id: "inv-4", athleteId: "ath-jordan", athleteName: "Jordan Vega", plan: "Pro Track", amountCents: 34000, dueDate: at(-1), status: "paid", method: "Card on file" },
  { id: "inv-5", athleteId: "ath-ren", athleteName: "Ren Tanaka", plan: "Elite", amountCents: 52000, dueDate: at(-2), status: "paid", method: "Square" },
  { id: "inv-6", athleteId: "ath-maya", athleteName: "Maya Okafor", plan: "Academy", amountCents: 26000, dueDate: at(6), status: "upcoming", method: "Square" },
  { id: "inv-7", athleteId: "ath-leo", athleteName: "Leo Martin", plan: "Executive", amountCents: 30000, dueDate: at(-1), status: "paid", method: "Card on file" },
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
