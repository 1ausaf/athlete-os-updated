import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { jordanTeamChannel } from "@/lib/demo/chat";
import { athleteById } from "@/lib/demo/data";
import { announcements } from "@/lib/demo/training";

import { MessagesClient } from "./messages-client";

/**
 * Athlete Messages — a single portal, not an inbox (client feedback):
 * - Tab 1 "Chat": one team channel with the whole coaching staff.
 *   Any coach can message the athlete; guardians are added for minors.
 *   Notifications go to the people managing this client — everyone else
 *   can still view the chat and subscribe themselves.
 * - Tab 2 "Announcements": read-only facility news feed — no replies.
 */
export default async function AthleteMessagesPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const { messages: seed, participants, unread } = jordanTeamChannel();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Messages"
        title="Messages"
        description="One channel to your whole coaching staff, plus the facility announcement feed. Chats with minor athletes always keep a second adult present — the Rule of Two."
        actions={
          unread > 0 ? (
            <Pill tone="brand" dot>
              {unread} unread
            </Pill>
          ) : (
            <Pill tone="success" dot>
              All caught up
            </Pill>
          )
        }
      />

      <MessagesClient
        athleteId={athlete.id}
        athleteName={athlete.name}
        participants={participants}
        initialMessages={seed}
        announcements={announcements}
      />
    </div>
  );
}
