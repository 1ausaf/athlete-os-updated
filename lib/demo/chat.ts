import {
  athleteById,
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
  | { kind: "image"; name: string }
  | { kind: "voice"; name: string; duration: string }
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

/**
 * Round 5 (P7 bug fix): the Messages page used to seed Jordan's channel for
 * EVERY athlete — a parent managing Maya saw Jordan's chat, attachments and
 * the "Adult athlete" banner. Channels are now resolved per athlete.
 */
export function teamChannelFor(athleteId: string): TeamChannel {
  if (athleteId === "ath-jordan") return jordanTeamChannel();

  const thread = threadById(threadIdFor(athleteId));
  if (thread) {
    return {
      messages: thread.messages.map((m) => ({ ...m })),
      participants: [...thread.participants],
      unread: thread.unread,
    };
  }

  // Athletes without a seeded thread still get a working channel: their
  // assigned coaches + admin — and for minors, their guardians (Rule of Two).
  const athlete = athleteById(athleteId);
  const guardians: ThreadParticipant[] = (athlete?.guardians ?? []).map(
    (g, i) => ({
      id: `guardian-${athleteId}-${i}`,
      name: g.name,
      role: "guardian",
    }),
  );
  return {
    messages: [],
    participants: [
      { id: "coach-ellis", name: "Coach Ellis", role: "coach" },
      { id: "admin-victoria", name: "Victoria Flores", role: "admin" },
      ...guardians,
      ...(athlete
        ? [
            {
              id: athlete.id,
              name: athlete.name,
              role: "athlete" as const,
              isMinor: athlete.isMinor,
            },
          ]
        : []),
    ],
    unread: 0,
  };
}

/** The staff-messaging thread for an athlete (round 6: the profile "Chat"
 *  button deep-links here). */
export function threadIdForAthlete(athleteId: string): string {
  return threadIdFor(athleteId);
}

function threadIdFor(athleteId: string): string {
  switch (athleteId) {
    case "ath-jordan":
      return "thread-jordan";
    case "ath-maya":
      return "thread-maya";
    case "ath-dre":
      return "thread-andre";
    default:
      return `thread-${athleteId.replace(/^ath-/, "")}`;
  }
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
  messages.push({
    id: "seed-ellis-photo",
    senderId: "coach-ellis",
    senderName: "Coach Ellis",
    senderRole: "coach",
    body: "Whiteboard from this morning — your next block's targets are on the right.",
    at: new Date(lastAt + 41 * 60000).toISOString(),
    attachments: [{ kind: "image", name: "block-c-whiteboard.jpg" }],
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
