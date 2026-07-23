"use client";

import { useState } from "react";
import { Eye, Send, Trash2 } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Message, MessageRole, ThreadParticipant } from "@/lib/demo/data";

/** A message plus local moderation state (O3: admin delete → tombstone). */
type ConvoMessage = Message & { removedAt?: string };

/** Deterministic hue from an id so avatars stay stable across renders. */
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ThreadConversation({
  initialMessages,
  participants,
  me,
  canPost = true,
  canDelete = false,
}: {
  initialMessages: Message[];
  participants: ThreadParticipant[];
  /** The signed-in staffer — messages they send attribute to them. */
  me: { id: string; name: string; role: MessageRole };
  /** False for staff who aren't assigned to this athlete (view only). */
  canPost?: boolean;
  /** True for admins/owners — enables per-message removal (O3). */
  canDelete?: boolean;
}) {
  const [messages, setMessages] = useState<ConvoMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        senderId: me.id,
        senderName: me.name,
        senderRole: me.role,
        body,
        at: new Date().toISOString(),
      },
    ]);
    setDraft("");
  }

  function removeMessage(id: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, removedAt: new Date().toISOString() } : m,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          const removed = Boolean(m.removedAt);
          return (
            <div
              key={m.id}
              className={cn(
                "group flex items-end gap-2.5",
                mine ? "flex-row-reverse" : "flex-row",
              )}
            >
              {!mine ? (
                <AthleteAvatar
                  initials={initialsFor(m.senderName)}
                  hue={hueFor(m.senderId)}
                  size="sm"
                />
              ) : null}
              <div
                className={cn(
                  "flex max-w-[78%] flex-col gap-1",
                  mine ? "items-end" : "items-start",
                )}
              >
                {!mine ? (
                  <span className="px-1 text-xs font-medium text-muted-foreground">
                    {m.senderName}
                    <span className="opacity-60"> · {m.senderRole}</span>
                  </span>
                ) : null}
                {removed ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40 px-3.5 py-2 text-xs italic text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Message removed by admin · {fmtTime(m.removedAt!)}
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm",
                        mine
                          ? "rounded-br-sm bg-brand/15 text-foreground"
                          : "rounded-bl-sm border border-border bg-surface/60",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="px-1 text-[0.7rem] text-muted-foreground">
                      {fmtTime(m.at)}
                    </span>
                  </>
                )}
              </div>
              {canDelete && !removed ? (
                <button
                  type="button"
                  onClick={() => removeMessage(m.id)}
                  aria-label={`Remove message from ${m.senderName} (admin)`}
                  title="Remove message (admin)"
                  className="mb-5 rounded-md p-1.5 text-muted-foreground/70 transition-all hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {canPost ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-soft">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
            placeholder="Write a message…  (⌘/Ctrl + Enter to send)"
            className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Messaging {participants.length} participant
              {participants.length === 1 ? "" : "s"}
              {canDelete ? " · hover a message to remove it (admin)" : ""}
            </span>
            <Button
              variant="brand"
              size="sm"
              onClick={send}
              disabled={!draft.trim()}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Eye className="h-4 w-4 shrink-0" />
          View only — you&rsquo;re not assigned to this athlete.
        </div>
      )}
    </div>
  );
}
