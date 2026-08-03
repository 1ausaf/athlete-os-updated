import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Clipboard } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { TabLinkBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { pastSessions, sessions } from "@/lib/demo/data";

import { SessionsList } from "./sessions-list";

/**
 * R6 (S1–S4): the sessions hub is an Amelia-style booking admin now — no stat
 * tiles, no featured card, just Upcoming | Past sessions tabs over a flat,
 * date-filterable table of rows with Bookings + Briefing on each one.
 */
export default async function StaffSessionsPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  const admin = isAdmin(user);

  const view = searchParams?.view === "past" ? "past" : "upcoming";

  // ISO strings sort lexicographically: upcoming soonest-first, past newest-first.
  const upcoming = [...sessions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  const past = [...pastSessions].sort((a, b) =>
    b.startsAt.localeCompare(a.startsAt),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team Workspace · Bookings"
        title="Bookings"
        description="Every block on the schedule — date, time, who has it, plus the bookings and briefings behind each one."
        actions={
          <Button asChild variant="brand" size="sm">
            <Link href={"/staff/sessions/huddle-brief" as Route}>
              <Clipboard className="h-4 w-4" />
              Briefings
            </Link>
          </Button>
        }
      />

      <TabLinkBar
        tabs={[
          {
            href: "/staff/sessions" as Route,
            label: "Upcoming",
            active: view === "upcoming",
            count: sessions.length,
          },
          {
            href: "/staff/sessions?view=past" as Route,
            label: "Past sessions",
            active: view === "past",
            count: pastSessions.length,
          },
        ]}
      />

      {/* key resets the range filter + selection when switching tabs */}
      <SessionsList
        key={view}
        mode={view}
        sessions={view === "upcoming" ? upcoming : past}
        isAdmin={admin}
      />
    </div>
  );
}
