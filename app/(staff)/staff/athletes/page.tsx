import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import {
  athletes,
  daysSinceLastNote,
  type AthleteStatus,
} from "@/lib/demo/data";
import { isAdmin, isStaff } from "@/lib/rbac";

import { MembersList } from "./members-list";

/**
 * Members — round 8: stat pills slimmed to what drives action (C2 — programs
 * due + needs-engagement), status tabs live in the URL (C8), and the add
 * buttons are admin-only links to the new onboarding pages (C4/C10).
 */
export default async function StaffAthletesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const active = athletes.filter((a) => a.status === "active");
  const dueSoon = active.filter((a) => a.programDueInDays <= 5).length;
  // C2 — active members with no coach comment in 14+ days (or ever).
  const needsEngagement = active.filter(
    (a) => daysSinceLastNote(a) >= 14,
  ).length;
  const avgAttendance = Math.round(
    active.reduce((sum, a) => sum + a.attendancePct, 0) / Math.max(1, active.length),
  );

  // C8 — the status tab is shareable; ?status=paused deep-links the tab.
  const statusParam = searchParams?.status;
  const initialStatus: AthleteStatus =
    statusParam === "paused" || statusParam === "inactive"
      ? statusParam
      : "active";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Team Workspace · Members"
        title="Members"
        description="Every member by status — click a row to open the full profile: notes, program, billing, the lot."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={dueSoon > 0 ? "warning" : "neutral"} dot>
              {dueSoon} programs due
            </Pill>
            <Pill tone={needsEngagement > 0 ? "danger" : "neutral"} dot>
              {needsEngagement} needs engagement
            </Pill>
            <Pill tone="neutral" dot>
              {avgAttendance}% attendance
            </Pill>
          </div>
        }
      />

      <MembersList
        athletes={athletes}
        viewerStaffId={user.id}
        admin={isAdmin(user)}
        initialStatus={initialStatus}
      />
    </div>
  );
}
