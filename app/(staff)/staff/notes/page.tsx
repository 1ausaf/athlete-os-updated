import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { athletes } from "@/lib/demo/data";

import { NotesHub, type FeedNote } from "./note-composer";

export default async function StaffNotesPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  // Flatten every athlete's CAP notes into a single cross-roster feed, newest first.
  const feed: FeedNote[] = athletes
    .flatMap((a) =>
      a.capNotes.map((n) => ({
        id: n.id,
        athleteId: a.id,
        athleteName: a.name,
        initials: a.initials,
        hue: a.hue,
        coach: n.coach,
        date: n.date,
        context: n.context,
        action: n.action,
        plan: n.plan,
      })),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const composerAthletes = athletes.map((a) => ({
    id: a.id,
    name: a.name,
    initials: a.initials,
    hue: a.hue,
  }));

  const authorName = isStaff(user) ? user.fullName : "Coach Ellis";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · CAP"
        title="CAP notes"
        description="Context · Action · Plan — one shared language for every session. Log a note and it lands at the top of the roster-wide feed instantly."
        actions={
          <Pill tone="brand" dot>
            {feed.length} notes logged
          </Pill>
        }
      />

      <NotesHub
        athletes={composerAthletes}
        initialNotes={feed}
        authorName={authorName}
      />

      <p className="text-xs text-muted-foreground">
        CAP keeps handoffs clean: any coach can pick up an athlete mid-block and
        know exactly where they left off.
      </p>
    </div>
  );
}
