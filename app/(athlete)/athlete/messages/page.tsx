
import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireAthleteContext } from "@/lib/demo/session";
import { teamChannelFor } from "@/lib/demo/chat";
import { athleteProfileById, parentAccountById } from "@/lib/demo/data";
import { announcements } from "@/lib/demo/training";

import { MessagesClient } from "./messages-client";

/**
 * Athlete Messages — round 10 (R6): the TAB split is back. Announcements got
 * long (full bodies, links, images), so the page tabs into Chat (first,
 * default) and Announcements; ?tab=announcements deep-links the news list.
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
        eyebrow="Member Portal · Chat"
        title="Chat"
        description={
          athlete.isMinor
            ? "Your channel to the whole coaching staff, plus facility announcements. Chats with minor athletes always keep a second adult present — the Rule of Two."
            : "Your channel to the whole coaching staff — facility announcements live on their own tab."
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
