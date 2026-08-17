"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Download,
  Eye,
  Film,
  ImageIcon,
  Info,
  Link2,
  Paperclip,
  Trash2,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import {
  ChatComposer,
  renderChatBody,
  VoiceNoteBubble,
} from "@/components/app/chat-composer";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/lib/demo/chat";
import { relTime } from "@/lib/demo/data";
import type { Message, MessageRole, ThreadParticipant } from "@/lib/demo/data";

/** A message plus local moderation state (O3: admin delete → tombstone). */
type ConvoMessage = Message & {
  removedAt?: string;
  attachments?: ChatAttachment[];
};

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

/** Round 12 (N18) — per-thread Subscribe checkbox state, persisted across
    visits ({[threadId]: boolean}; absent = the seed subscription). */
const SUBS_KEY = "aos-thread-subs";

function readSubsMap(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(SUBS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
    }
  } catch {
    // Corrupt storage — fall back to seeds.
  }
  return {};
}

export function ThreadConversation({
  threadId,
  initialMessages,
  participants,
  me,
  canPost = true,
  canDelete = false,
  canJoin = false,
  seedSubscribed = false,
  mentionNames,
}: {
  threadId: string;
  initialMessages: Message[];
  participants: ThreadParticipant[];
  /** The signed-in staffer — messages they send attribute to them. */
  me: { id: string; name: string; role: MessageRole };
  /** False for staff who aren't assigned to this athlete (view only). */
  canPost?: boolean;
  /** True for admins/owners — enables per-message removal (O3). */
  canDelete?: boolean;
  /** C35: a viewing coach can JOIN the chat + get notified (local state). */
  canJoin?: boolean;
  /** N18 — the inbox's hardcoded Subscribed set seeds the checkbox. */
  seedSubscribed?: boolean;
  /** X5 — names offered by the composer's @ picker. */
  mentionNames?: string[];
}) {
  const [messages, setMessages] = useState<ConvoMessage[]>(initialMessages);
  // N18 — persistent Subscribe checkbox (replaces the R8 one-shot button).
  const [subscribed, setSubscribed] = useState(false);
  // R35 — which message's read-receipt popover is open.
  const [receiptOpen, setReceiptOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Checkbox loads after mount (avoids SSR/localStorage hydration mismatch).
  useEffect(() => {
    setSubscribed(readSubsMap()[threadId] ?? seedSubscribed);
  }, [threadId, seedSubscribed]);

  function toggleSubscribed(next: boolean) {
    setSubscribed(next);
    try {
      window.localStorage.setItem(
        SUBS_KEY,
        JSON.stringify({ ...readSubsMap(), [threadId]: next }),
      );
    } catch {
      // Storage unavailable — subscription stays session-only.
    }
  }

  // N18 — for view-only coaches, subscribing = joining (posting + notify).
  const posting = canPost || (canJoin && subscribed);

  useEffect(() => {
    // Keep the newest message in view — the pane is a fixed-height scroller.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  // R35 — click anywhere else closes the receipt popover.
  useEffect(() => {
    if (!receiptOpen) return;
    const close = () => setReceiptOpen(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [receiptOpen]);

  // R35 — deterministic demo receipts: the LATEST staff message is read by
  // the athlete participants; earlier staff messages are read by everyone
  // else on the thread. Anything sent this session is delivered, not read.
  const lastSeedStaffId =
    [...initialMessages]
      .reverse()
      .find((m) => m.senderRole === "coach" || m.senderRole === "admin")?.id ??
    null;

  function receiptLabel(m: ConvoMessage): { read: boolean; text: string } {
    if (m.id.startsWith("local-"))
      return { read: false, text: "Delivered — not read yet" };
    const readers =
      m.id === lastSeedStaffId
        ? participants.filter((p) => p.role === "athlete")
        : participants.filter((p) => p.id !== m.senderId);
    if (readers.length === 0)
      return { read: false, text: "Delivered — not read yet" };
    const readAt = new Date(
      Math.min(Date.now(), new Date(m.at).getTime() + 25 * 60_000),
    ).toISOString();
    return {
      read: true,
      text: `Read by ${readers.map((r) => r.name).join(", ")} · ${relTime(readAt)}`,
    };
  }

  function send(body: string, attachments: ChatAttachment[]) {
    if (!body && attachments.length === 0) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        senderId: me.id,
        senderName: me.name,
        senderRole: me.role,
        body,
        at: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    ]);
  }

  function removeMessage(id: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, removedAt: new Date().toISOString() } : m,
      ),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Message list — fills the pane, scrolls independently (C35) */}
      <div
        ref={listRef}
        // R34 — a floor on phones keeps the message area usably tall even
        // with the composer + header chrome; desktop keeps the flex fill.
        className="flex min-h-[14rem] flex-1 flex-col gap-4 overflow-y-auto pr-1 scrollbar-slim md:min-h-0"
      >
        {messages.map((m) => {
          const mine = m.senderId === me.id;
          const removed = Boolean(m.removedAt);
          // R35 — staff-sent messages carry a subtle read-receipt affordance.
          const staffSent =
            m.senderRole === "coach" || m.senderRole === "admin";
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
                      {m.body ? renderChatBody(m.body) : null}
                      {m.attachments?.map((a, i) => (
                        <AttachmentView key={i} attachment={a} />
                      ))}
                    </div>
                    <span className="flex items-center gap-1 px-1 text-[0.7rem] text-muted-foreground">
                      {fmtTime(m.at)}
                      {staffSent ? (
                        <span
                          className="relative inline-flex"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setReceiptOpen((cur) =>
                                cur === m.id ? null : m.id,
                              )
                            }
                            aria-expanded={receiptOpen === m.id}
                            aria-label="Who has read this message"
                            title="Who has read this message"
                            className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                          {receiptOpen === m.id ? (
                            <span
                              role="status"
                              className={cn(
                                "absolute bottom-full z-30 mb-1 w-max max-w-[260px] rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[0.7rem] shadow-raised",
                                mine ? "right-0" : "left-0",
                                receiptLabel(m).read
                                  ? "font-medium text-foreground/90"
                                  : "text-muted-foreground",
                              )}
                            >
                              {receiptLabel(m).text}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
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

      {/* Composer pinned at the bottom of the pane */}
      {posting ? (
        <div className="shrink-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <SubscribeCheckbox
              checked={subscribed}
              onChange={toggleSubscribed}
            />
            {subscribed ? (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-ink">
                <BellRing className="h-3.5 w-3.5" />
                Subscribed — you&apos;ll be notified of new messages in this
                chat.
              </p>
            ) : null}
          </div>
          <ChatComposer
            onSend={send}
            mentionNames={mentionNames}
            hint={`Messaging ${participants.length} participant${
              participants.length === 1 ? "" : "s"
            } · Ctrl+Enter sends`}
          />
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Eye className="h-4 w-4 shrink-0" />
            View only — you&rsquo;re not subscribed to this chat.
          </span>
          {/* N18: the unsubscribed coach's way in — checking Subscribe joins
              the chat (posting + notifications). */}
          <SubscribeCheckbox
            checked={subscribed}
            onChange={toggleSubscribed}
            className="ml-auto"
          />
        </div>
      )}
    </div>
  );
}

/** N18 — the labeled "Subscribe to Chat" checkbox (every viewer gets one). */
function SubscribeCheckbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 text-xs font-medium",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
      />
      Subscribe to Chat
    </label>
  );
}

/** Attachment renderer: voice notes play, media downloads (mock). */
function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "voice") {
    return <VoiceNoteBubble duration={attachment.duration} />;
  }
  if (attachment.kind === "link") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-xs font-medium text-brand-ink underline-offset-2 hover:underline"
      >
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        {attachment.label}
      </a>
    );
  }
  const Icon =
    attachment.kind === "video"
      ? Film
      : attachment.kind === "image"
        ? ImageIcon
        : Paperclip;
  return (
    <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-2.5 py-1.5 text-xs font-medium">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{attachment.name}</span>
      {"duration" in attachment ? (
        <span className="tnum text-muted-foreground">
          {attachment.duration}
        </span>
      ) : null}
      <button
        type="button"
        title="Download (demo)"
        aria-label={`Download ${attachment.name}`}
        className="ml-1 inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[0.7rem] font-semibold transition-colors hover:bg-accent"
      >
        <Download className="h-3 w-3" />
        Download
      </button>
    </span>
  );
}
