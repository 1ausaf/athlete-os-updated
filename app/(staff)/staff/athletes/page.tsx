import { redirect } from "next/navigation";
import { CalendarCheck, CreditCard, ShieldAlert, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes } from "@/lib/demo/data";
import { isStaff } from "@/lib/rbac";

import { RosterFilter } from "./roster-filter";

export default async function StaffAthletesPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const minors = athletes.filter((a) => a.isMinor).length;
  const overdue = athletes.filter((a) => a.billing.state === "overdue").length;
  const avgAttendance = Math.round(
    athletes.reduce((sum, a) => sum + a.attendancePct, 0) / athletes.length,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Athletes"
        title="Roster"
        description="Every athlete you coach or oversee, on one screen — program, attendance, billing and flags at a glance. Open a profile to drill in."
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active athletes"
          value={athletes.length}
          icon={Users}
          hint="On your roster"
        />
        <StatTile
          label="Minors"
          value={minors}
          icon={ShieldAlert}
          hint="Rule of Two applies"
        />
        <StatTile
          label="Overdue billing"
          value={overdue}
          icon={CreditCard}
          accent={overdue > 0}
          delta={
            overdue > 0
              ? { value: "needs attention", direction: "down" }
              : undefined
          }
          hint={overdue === 0 ? "All in good standing" : undefined}
        />
        <StatTile
          label="Avg attendance"
          value={avgAttendance}
          unit="%"
          icon={CalendarCheck}
          hint="Roster mean"
        />
      </div>

      <RosterFilter athletes={athletes} />
    </div>
  );
}
