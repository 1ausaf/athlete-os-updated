/**
 * Staff roster, access levels and per-athlete coach assignments (round 3).
 *
 * The client's model: every athlete has a PROGRAMMING coach, a (client-)
 * MANAGEMENT coach and optional ASSISTANT coaches. Assignments drive which
 * message threads a coach is in, board filtering ("only my athletes") and the
 * programming-queue filter. The owner manages access levels + staff records
 * (certifications, vulnerable-sector checks) from the Team page.
 */

import { at } from "@/lib/demo/data";

export type StaffAccessLevel = "full" | "management" | "coaching";

export const ACCESS_LEVEL_LABEL: Record<StaffAccessLevel, string> = {
  full: "Full admin",
  management: "Client management",
  coaching: "Coaching",
};

export interface StaffCertification {
  name: string;
  status: "valid" | "expiring" | "expired";
  expires: string;
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  hue: number;
  role: "owner" | "admin" | "coach";
  accessLevel: StaffAccessLevel;
  title: string;
  email: string;
  phone: string;
  bio: string;
  certifications: StaffCertification[];
  vulnerableSector: { status: "on-file" | "due"; uploadedAt?: string };
  notifications: { push: boolean; email: boolean };
}

export const staffMembers: StaffMember[] = [
  {
    id: "owner-jeremy",
    name: "Jeremy Choi",
    initials: "JC",
    hue: 264,
    role: "owner",
    accessLevel: "full",
    title: "Founder / COO",
    email: "jeremy@lpsathletic.com",
    phone: "+1 (416) 555-0100",
    bio: "Runs the business side of The Pro Maker™ — programs, people, growth.",
    certifications: [
      { name: "Standard First Aid + CPR-C", status: "valid", expires: at(400) },
    ],
    vulnerableSector: { status: "on-file", uploadedAt: at(-200) },
    notifications: { push: true, email: true },
  },
  {
    id: "admin-victoria",
    name: "Victoria Flores",
    initials: "VF",
    hue: 330,
    role: "admin",
    accessLevel: "full",
    title: "Client Success / Admin",
    email: "victoria@lpsathletic.com",
    phone: "+1 (416) 555-0102",
    bio: "Owns onboarding, billing and every client-facing checklist.",
    certifications: [
      { name: "Standard First Aid + CPR-C", status: "valid", expires: at(280) },
    ],
    vulnerableSector: { status: "on-file", uploadedAt: at(-160) },
    notifications: { push: true, email: true },
  },
  {
    id: "coach-clance",
    name: "Coach Clance",
    initials: "CL",
    hue: 20,
    role: "coach",
    accessLevel: "coaching",
    title: "Head of Programming",
    email: "clance@lpsathletic.com",
    phone: "+1 (416) 555-0103",
    bio: "Writes the master programs and the nutrition protocols.",
    certifications: [
      { name: "NCCP Weightlifting", status: "valid", expires: at(500) },
      { name: "Standard First Aid + CPR-C", status: "expiring", expires: at(30) },
    ],
    vulnerableSector: { status: "on-file", uploadedAt: at(-320) },
    notifications: { push: true, email: false },
  },
  {
    id: "coach-ellis",
    name: "Coach Ellis",
    initials: "CE",
    hue: 150,
    role: "coach",
    accessLevel: "management",
    title: "Head Coach",
    email: "ellis@lpsathletic.com",
    phone: "+1 (416) 555-0104",
    bio: "Floor lead — semi-private blocks, athlete management, huddles.",
    certifications: [
      { name: "CSCS", status: "valid", expires: at(320) },
      { name: "Standard First Aid + CPR-C", status: "valid", expires: at(190) },
    ],
    vulnerableSector: { status: "on-file", uploadedAt: at(-90) },
    notifications: { push: true, email: true },
  },
  {
    id: "coach-nadia",
    name: "Coach Nadia",
    initials: "CN",
    hue: 200,
    role: "coach",
    accessLevel: "coaching",
    title: "Speed & Development Coach",
    email: "nadia@lpsathletic.com",
    phone: "+1 (416) 555-0105",
    bio: "Sprint mechanics, youth development, return-to-play progressions.",
    certifications: [
      { name: "NCCP Athletics", status: "valid", expires: at(410) },
      { name: "Standard First Aid + CPR-C", status: "expired", expires: at(-12) },
    ],
    vulnerableSector: { status: "due" },
    notifications: { push: false, email: true },
  },
  {
    id: "coach-mason",
    name: "Coach Mason",
    initials: "CM",
    hue: 45,
    role: "coach",
    accessLevel: "coaching",
    title: "Assistant Coach",
    email: "mason@lpsathletic.com",
    phone: "+1 (416) 555-0106",
    bio: "Assists on the floor across all semi-private blocks.",
    certifications: [
      { name: "Standard First Aid + CPR-C", status: "valid", expires: at(250) },
    ],
    vulnerableSector: { status: "on-file", uploadedAt: at(-45) },
    notifications: { push: true, email: true },
  },
];

export function staffById(id: string): StaffMember | undefined {
  return staffMembers.find((s) => s.id === id);
}

/** Sessions store the coach by display name — resolve to the staff record. */
export function staffByName(name: string): StaffMember | undefined {
  return staffMembers.find((s) => s.name === name);
}

/* ------------------------------------------------------------------ */
/* Coach assignments (C7) — programming / management / assistant       */
/* ------------------------------------------------------------------ */

export type CoachRole = "programming" | "management" | "assistant";

export const COACH_ROLE_LABEL: Record<CoachRole, string> = {
  programming: "Programming coach",
  management: "Management coach",
  assistant: "Assistant coach",
};

export interface CoachAssignment {
  athleteId: string;
  staffId: string;
  role: CoachRole;
}

export const coachAssignments: CoachAssignment[] = [
  { athleteId: "ath-jordan", staffId: "coach-clance", role: "programming" },
  { athleteId: "ath-jordan", staffId: "coach-ellis", role: "management" },
  { athleteId: "ath-jordan", staffId: "coach-nadia", role: "assistant" },
  { athleteId: "ath-maya", staffId: "coach-ellis", role: "programming" },
  { athleteId: "ath-maya", staffId: "coach-ellis", role: "management" },
  { athleteId: "ath-maya", staffId: "coach-nadia", role: "assistant" },
  { athleteId: "ath-noah", staffId: "coach-nadia", role: "programming" },
  { athleteId: "ath-noah", staffId: "coach-nadia", role: "management" },
  { athleteId: "ath-noah", staffId: "coach-mason", role: "assistant" },
  { athleteId: "ath-dre", staffId: "coach-clance", role: "programming" },
  { athleteId: "ath-dre", staffId: "coach-ellis", role: "management" },
  { athleteId: "ath-dre", staffId: "coach-mason", role: "assistant" },
  { athleteId: "ath-sofia", staffId: "coach-nadia", role: "programming" },
  { athleteId: "ath-sofia", staffId: "admin-victoria", role: "management" },
  { athleteId: "ath-ren", staffId: "coach-clance", role: "programming" },
  { athleteId: "ath-ren", staffId: "coach-nadia", role: "management" },
  { athleteId: "ath-ty", staffId: "coach-ellis", role: "programming" },
  { athleteId: "ath-ty", staffId: "coach-ellis", role: "management" },
  { athleteId: "ath-priya", staffId: "coach-ellis", role: "programming" },
  { athleteId: "ath-priya", staffId: "admin-victoria", role: "management" },
  { athleteId: "ath-leo", staffId: "coach-nadia", role: "programming" },
  { athleteId: "ath-leo", staffId: "admin-victoria", role: "management" },
];

export function assignmentsForAthlete(athleteId: string): CoachAssignment[] {
  return coachAssignments.filter((a) => a.athleteId === athleteId);
}

export function athleteIdsForStaff(staffId: string): Set<string> {
  return new Set(
    coachAssignments
      .filter((a) => a.staffId === staffId)
      .map((a) => a.athleteId),
  );
}

/** Staff involved with an athlete — these people are IN the thread (C20). */
export function assignedStaffIds(athleteId: string): Set<string> {
  return new Set(
    coachAssignments
      .filter((a) => a.athleteId === athleteId)
      .map((a) => a.staffId),
  );
}
