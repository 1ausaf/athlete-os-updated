import {
  threadById,
  type Message,
  type ThreadParticipant,
} from "@/lib/demo/data";

/**
 * The athlete team channel, seeded once and shared by every surface that
 * shows it (Messages page, dashboard chat preview) so the latest message —
 * and its sender — always agree across the app.
 */

export type ChatAttachment =
  | { kind: "video"; name: string; duration: string }
  | { kind: "link"; url: string; label: string }
  | { kind: "file"; name: string };

export interface ChatMessage extends Message {
  attachments?: ChatAttachment[];
}

export interface TeamChannel {
  messages: ChatMessage[];
  participants: ThreadParticipant[];
  unread: number;
}

/** Jordan's staff-wide channel: base thread + Coach Nadia's video follow-up. */
export function jordanTeamChannel(): TeamChannel {
  const thread = threadById("thread-jordan");

  const messages: ChatMessage[] = (thread?.messages ?? []).map((m) => ({
    ...m,
  }));
  const lastAt =
    messages.length > 0
      ? new Date(messages[messages.length - 1]!.at).getTime()
      : Date.now();
  messages.push({
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

  // Channel roster: existing coaches first, then Coach Nadia, then
  // Victoria Flores (admin — she manages this client), then the athlete.
  const base = thread?.participants ?? [];
  const participants: ThreadParticipant[] = [
    ...base.filter((p) => p.role === "coach"),
    ...(base.some((p) => p.id === "coach-nadia")
      ? []
      : [{ id: "coach-nadia", name: "Coach Nadia", role: "coach" as const }]),
    ...(base.some((p) => p.id === "admin-victoria")
      ? []
      : [
          {
            id: "admin-victoria",
            name: "Victoria Flores",
            role: "admin" as const,
          },
        ]),
    ...base.filter((p) => p.role !== "coach"),
  ];

  return {
    messages,
    participants,
    unread: (thread?.unread ?? 0) + 1, // + Coach Nadia's seeded message
  };
}
