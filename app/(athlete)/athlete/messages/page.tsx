
import { PageHeader } from "@/components/app/page-header";
import { requireAthleteContext } from "@/lib/demo/session";
import { channelDisplayNameFor, teamChannelFor } from "@/lib/demo/chat";
import { athleteProfileById, parentAccountById } from "@/lib/demo/data";
import { publishedAnnouncements } from "@/lib/demo/training";

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
      {/* Round 11 (M2): the unread pill moved down into the tab row. */}
      <PageHeader
        title="Chat"
        description={
          athlete.isMinor
            ? "Chat with the LPS team. Get informed with Announcements. Chats with minor athletes keep a second adult present — the Rule of Two."
            : "Chat with the LPS team. Get informed with Announcements."
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
        announcements={publishedAnnouncements()}
        unread={unread}
        channelName={channelDisplayNameFor(athlete.id)}
      />
    </div>
  );
}
