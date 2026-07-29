
import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import { teamChannelFor } from "@/lib/demo/chat";
import { athleteProfileById, parentAccountById } from "@/lib/demo/data";
import { announcements } from "@/lib/demo/training";

import { MessagesClient } from "./messages-client";

/**
 * Athlete Messages — a single portal, not an inbox (client feedback):
 * - Tab 1 "Chat": one team channel with the whole coaching staff.
 *   Everyone in the channel is presubscribed (round 5, A11 — no roster
 *   block). Guardians are in the channel for minors (Rule of Two).
 * - Tab 2 "Announcements": read-only facility news feed — no replies.
 *
 * Round 5 (B1/P7): the channel is resolved PER ATHLETE — a parent managing
 * Maya sees Maya's chat, never Jordan's. Round 5 (P5): messages typed while
 * a parent is managing carry the PARENT's name so coaches know who's typing.
 */
export default async function AthleteMessagesPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const { user, athlete, isParentView } = requireAthleteContext();
  const { messages: seed, participants, unread } = teamChannelFor(athlete.id);

  const parentName = isParentView
    ? (parentAccountById(user.id)?.name ??
      athleteProfileById(athlete.id)?.guardian?.name ??
      user.fullName)
    : null;

  const initialTab = searchParams?.tab === "announcements" ? "announcements" : "chat";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Messages"
        title="Messages"
        description={
          athlete.isMinor
            ? "One channel to the whole coaching staff, plus the facility announcement feed. Chats with minor athletes always keep a second adult present — the Rule of Two."
            : "One channel to your whole coaching staff, plus the facility announcement feed."
        }
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
        isMinor={athlete.isMinor}
        isParentView={isParentView}
        parentName={parentName}
        participants={participants}
        initialMessages={seed}
        announcements={announcements}
        initialTab={initialTab}
      />
    </div>
  );
}
