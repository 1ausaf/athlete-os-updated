import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athletes } from "@/lib/demo/data";
import { assignmentsForAthlete, staffMembers } from "@/lib/demo/staff";
import { complianceStats } from "@/lib/demo/training";

import {
  ComplianceTabs,
  type ComplianceTab,
  type MemberComplianceRow,
} from "./compliance-tabs";

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
 * Round 18 (D14): Compliance is the retention tool now — Members | Staff
 * tabs. Members ranks every ACTIVE athlete by attendance / log rate / last
 * login; Staff keeps the records summary. The old Rule-of-Two audit content
 * is gone from this page (the messaging guardrail itself is unchanged).
 */
export default async function StaffCompliancePage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  // Booking/log stats over the trailing 30 days (same window as Analytics).
  const toMs = Date.now();
  const fromMs = toMs - 30 * DAY_MS;

  const rows: MemberComplianceRow[] = athletes
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

  // ?tab=staff deep-links the Staff tab (house URL-backed tab convention).
  const initialTab: ComplianceTab =
    searchParams?.tab === "staff" ? "staff" : "members";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compliance"
        description="Member engagement and staff records — who needs a nudge before they drift."
      />
      <ComplianceTabs
        rows={rows}
        admin={isAdmin(user)}
        initialTab={initialTab}
      />
    </div>
  );
}
