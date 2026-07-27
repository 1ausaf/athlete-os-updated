import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { MembersList } from "./members-list";

/**
 * Members — round 4: the Trello board is gone. One sortable list with status
 * tabs (Active / Away / Paused / Inactive); a row opens the full client
 * profile directly.
 */
export default async function StaffAthletesPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const active = athletes.filter((a) => a.status === "active");
  const dueSoon = active.filter((a) => a.programDueInDays <= 5).length;
  const overdue = active.filter((a) => a.billing.state === "overdue").length;
  const avgAttendance = Math.round(
    active.reduce((sum, a) => sum + a.attendancePct, 0) / Math.max(1, active.length),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Staff Workspace · Members"
        title="Members"
        description="Every client by status — click a member to open their full profile: notes, checklists, program, billing, the lot."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone="neutral" dot>
              {active.length} active
            </Pill>
            <Pill tone={dueSoon > 0 ? "warning" : "neutral"} dot>
              {dueSoon} programs due
            </Pill>
            <Pill tone={overdue > 0 ? "danger" : "neutral"} dot>
              {overdue} overdue billing
            </Pill>
            <Pill tone="neutral" dot>
              {avgAttendance}% attendance
            </Pill>
          </div>
        }
      />

      <MembersList athletes={athletes} viewerStaffId={user.id} />
    </div>
  );
}
