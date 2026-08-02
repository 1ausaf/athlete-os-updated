
import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import { teamChannelFor } from "@/lib/demo/chat";
import { athleteProfileById, parentAccountById } from "@/lib/demo/data";
import { announcements } from "@/lib/demo/training";

import { MessagesClient } from "./messages-client";

/**
 * Athlete Messages — round 7: "they only have one channel", so the page goes
 * STRAIGHT to the chat (no tabs); the read-only announcement feed sits
 * compactly below.
 *
 * Round 5 (B1/P7): the channel is resolved PER ATHLETE — a parent managing
 * Maya sees Maya's chat, never Jordan's. Round 5 (P5): messages typed while
 * a parent is managing carry the PARENT's name so coaches know who's typing.
 */
export default async function AthleteMessagesPage() {
  const { user, athlete, isParentView } = requireAthleteContext();
  const { messages: seed, participants, unread } = teamChannelFor(athlete.id);

  const parentName = isParentView
    ? (parentAccountById(user.id)?.name ??
      athleteProfileById(athlete.id)?.guardian?.name ??
      user.fullName)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Messages"
        title="Messages"
        description={
          athlete.isMinor
            ? "One channel to the whole coaching staff. Chats with minor athletes always keep a second adult present — the Rule of Two."
            : "One channel to your whole coaching staff."
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
      />
    </div>
  );
}
