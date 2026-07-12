import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, threadById } from "@/lib/demo/data";
import type { ThreadParticipant } from "@/lib/demo/data";
import { announcements } from "@/lib/demo/training";

import { MessagesClient } from "./messages-client";
import type { ChatMessage } from "./messages-client";

/**
 * Athlete Messages — a single portal, not an inbox (client feedback):
 * - Tab 1 "Coach chat": one team channel with the whole coaching staff.
 *   Any coach can message the athlete; guardians are added for minors.
 * - Tab 2 "Announcements": read-only facility news feed — no replies.
 */
export default async function AthleteMessagesPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const thread = threadById("thread-jordan");

  // Seed the channel with Jordan's existing conversation, then add a message
  // from a second coach (with a video attachment) so it reads as a true
  // staff-wide channel rather than a 1:1 with one coach.
  const seed: ChatMessage[] = (thread?.messages ?? []).map((m) => ({ ...m }));
  const lastAt =
    seed.length > 0
      ? new Date(seed[seed.length - 1]!.at).getTime()
      : Date.now();
  seed.push({
    id: "seed-nadia-1",
    senderId: "coach-nadia",
    senderName: "Coach Nadia",
    senderRole: "coach",
    body: "Jumping in from the speed side — bar speed on that top set was excellent. Here's Tuesday's angle so you can see the hip position at lockout.",
    at: new Date(lastAt + 26 * 60000).toISOString(),
    attachments: [
      { kind: "video", name: "jordan-trapbar-hips.mp4", duration: "0:38" },
    ],
  });

  // Channel roster: existing coaches first, then Coach Nadia, then the athlete.
  const base = thread?.participants ?? [];
  const participants: ThreadParticipant[] = [
    ...base.filter((p) => p.role === "coach"),
    ...(base.some((p) => p.id === "coach-nadia")
      ? []
      : [{ id: "coach-nadia", name: "Coach Nadia", role: "coach" as const }]),
    ...base.filter((p) => p.role !== "coach"),
  ];

  const unread = (thread?.unread ?? 0) + 1; // + Coach Nadia's seeded message

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
