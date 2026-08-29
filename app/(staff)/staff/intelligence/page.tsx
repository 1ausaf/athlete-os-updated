import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athletes } from "@/lib/demo/data";
import {
  assignmentsForAthlete,
  coachAssignments,
  staffMembers,
} from "@/lib/demo/staff";
import { complianceStats } from "@/lib/demo/training";

import {
  IntelligenceTabs,
  type IntelligenceTab,
  type MemberIntelRow,
  type StaffIntelRow,
} from "./intelligence-tabs";

const DAY_MS = 86_400_000;

/** Coach display name for one of the athlete's assignment roles. */
function coachOf(
  athleteId: string,
  role: "programming" | "management",
): string {
  const id = assignmentsForAthlete(athleteId).find(
    (a) => a.role === role,
  )?.staffId;
  return staffMembers.find((s) => s.id === id)?.name ?? "—";
}

/**
 * Round 19: Compliance became INTELLIGENCE, and coaches get it too. Members
 * ranks every ACTIVE athlete by attendance / log rate / last login with
 * program- and management-coach filters (everyone); the Staff tab ranks
 * coach workload — programming/management load, unread chats, overdue tasks,
 * licenses, last sign-in (owner/admin only).
 */
export default async function StaffIntelligencePage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  const admin = isAdmin(user);

  // Booking/log stats over the trailing 30 days (same window as Analytics).
  const toMs = Date.now();
  const fromMs = toMs - 30 * DAY_MS;

  const rows: MemberIntelRow[] = athletes
    .filter((a) => a.status === "active")
    .map((a) => {
      const stats = complianceStats(a.id, fromMs, toMs);
      return {
        id: a.id,
        name: a.name,
        programCoach: coachOf(a.id, "programming"),
        managementCoach: coachOf(a.id, "management"),
        attendancePct: a.attendancePct,
        logRatePct: stats.fillPct,
        lastLogin: stats.lastLogin,
      };
    });

  // Per-coach workload for the Staff tab — active members only.
  const activeById = new Map(
    athletes.filter((a) => a.status === "active").map((a) => [a.id, a]),
  );
  // Managed members with no note in the last 14 days need a touchpoint.
  const noteCutoffMs = toMs - 14 * DAY_MS;
  const staffRows: StaffIntelRow[] = staffMembers.map((s) => {
    const programming = coachAssignments
      .filter((a) => a.role === "programming" && a.staffId === s.id)
      .map((a) => activeById.get(a.athleteId))
      .filter((a): a is (typeof athletes)[number] => Boolean(a));
    const managing = coachAssignments
      .filter((a) => a.role === "management" && a.staffId === s.id)
      .map((a) => activeById.get(a.athleteId))
      .filter((a): a is (typeof athletes)[number] => Boolean(a));
    return {
      id: s.id,
      name: s.name,
      title: s.title,
      programCount: programming.length,
      programOverdue: programming.filter((a) => a.programDueInDays < 0).length,
      manageCount: managing.length,
      manageNeedsNote: managing.filter(
        (a) =>
          !a.notes.some((n) => new Date(n.date).getTime() >= noteCutoffMs),
      ).length,
      licensesExpired: s.certifications.some((c) => c.status === "expired"),
    };
  });

  // ?tab=staff deep-links the Staff tab (house URL-backed tab convention).
  const initialTab: IntelligenceTab =
    admin && searchParams?.tab === "staff" ? "staff" : "members";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Intelligence"
        description={
          admin
            ? "Member retention and staff workload — who needs a nudge before they drift."
            : "Member engagement — who needs a nudge before they drift."
        }
      />
      <IntelligenceTabs
        rows={rows}
        staffRows={admin ? staffRows : []}
        admin={admin}
        initialTab={initialTab}
      />
    </div>
  );
}
