import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { RosterBoard } from "./roster-board";

/**
 * The member board — a faithful port of the client's Trello workflow.
 * Columns = membership buckets, cards = athletes sorted by programming due
 * date, click a card for the full record with notes as the comment feed.
 */
export default async function StaffAthletesPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const dueSoon = athletes.filter((a) => a.programDueInDays <= 5).length;
  const overdue = athletes.filter((a) => a.billing.state === "overdue").length;
  const avgAttendance = Math.round(
    athletes.reduce((sum, a) => sum + a.attendancePct, 0) / athletes.length,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Staff Workspace · Athletes"
        title="Member board"
        description="Cards sort by programming due date inside each list — click one to open the athlete's record and notes."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone="neutral" dot>
              {athletes.length} active
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

      <RosterBoard athletes={athletes} viewerStaffId={user.id} />
    </div>
  );
}
