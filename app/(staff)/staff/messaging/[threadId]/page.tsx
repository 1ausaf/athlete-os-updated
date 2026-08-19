import { notFound, redirect } from "next/navigation";
import { Megaphone } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athleteById, threadById } from "@/lib/demo/data";
import { assignedStaffIds, staffMembers } from "@/lib/demo/staff";

import { ThreadConversation, ThreadSubscribeBar } from "./thread-conversation";

/**
 * Round 12 (N18): mirror of the inbox's hardcoded Subscribed set (see
 * ../page.tsx) — seeds the thread's Subscribe checkbox for staff who follow
 * a chat without being assigned to the member.
 */
const SUBSCRIBED: Record<string, readonly string[]> = {
  "coach-ellis": ["thread-broadcast"],
  "owner-jeremy": ["thread-jordan", "thread-broadcast"],
  "admin-victoria": ["thread-broadcast"],
};

interface PageProps {
  params: { threadId: string };
}

export default async function StaffThreadPage({ params }: PageProps) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  const admin = isAdmin(user);

  const thread = threadById(params.threadId);
  if (!thread) notFound();

  const isBroadcast = thread.kind === "broadcast";

  // C20: involvement follows coach assignments for the thread's athlete.
  const athleteParticipant = thread.participants.find(
    (p) => p.role === "athlete" && athleteById(p.id),
  );
  const involved = isBroadcast
    ? true
    : athleteParticipant
      ? assignedStaffIds(athleteParticipant.id).has(user.id)
      : false;
  const canPost = involved || admin;

  // X5 — the @ picker offers everyone in the thread plus the whole staff
  // roster (deduped, minus yourself).
  const mentionNames = Array.from(
    new Set([
      ...thread.participants.map((p) => p.name),
      ...staffMembers.map((s) => s.name),
    ]),
  ).filter((n) => n !== user.fullName);

  return (
    // C35: the thread fills the screen to the bottom — the message pane
    // stretches, scrolls internally, and the composer pins at the bottom.
    // R34: iPhone got a too-short window — dvh sizing (with a vh fallback)
    // plus a 70dvh floor keeps the message area usably tall on mobile.
    <div className="flex min-h-[70dvh] h-[calc(100vh-7rem)] supports-[height:100dvh]:h-[calc(100dvh-7rem)] flex-col gap-4 md:h-[calc(100vh-9rem)] md:supports-[height:100dvh]:h-[calc(100dvh-9rem)]">
      {/* Round 14 (V14): the title stands alone — the participant roster
          moved into the "Who's in this chat" disclosure below the chat */}
      <PageHeader title={thread.subject} />

      {/* R8 (H3): the Rule-of-Two banner is gone — the admin auto-adds
          parents on every minor's chat, so there's nothing to police here. */}
      {isBroadcast ? (
        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/[0.06] px-3 py-2 text-xs text-info">
          <Megaphone className="h-4 w-4 shrink-0" />
          Broadcast announcement — sent to all members. Replies route privately
          to staff.
        </div>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          {/* Round 14 (V11/V14): the participants pill row is gone — the
              roster lives in the disclosure below the card. */}
          <ThreadConversation
            threadId={thread.id}
            initialMessages={thread.messages}
            participants={thread.participants}
            mentionNames={mentionNames}
            me={{
              id: user.id,
              name: user.fullName,
              role: admin ? "admin" : "coach",
            }}
            canPost={canPost}
            canDelete={admin}
            canJoin={!canPost}
            seedSubscribed={SUBSCRIBED[user.id]?.includes(thread.id) ?? false}
          />
        </CardContent>
      </Card>

      {/* Round 14 (V12): Subscribe sits below the conversation now, with the
          who's-in-this-chat roster disclosure (V14) beside it */}
      <ThreadSubscribeBar
        threadId={thread.id}
        seedSubscribed={SUBSCRIBED[user.id]?.includes(thread.id) ?? false}
        participants={thread.participants}
      />
    </div>
  );
}
