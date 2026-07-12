"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Film,
  Link2,
  Megaphone,
  MessagesSquare,
  SendHorizonal,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { RuleOfTwoBanner } from "@/components/app/rule-of-two";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Message, ThreadParticipant } from "@/lib/demo/data";
import { relTime } from "@/lib/demo/data";
import type { Announcement } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Demo-local message model: base Message + optional media attachments  */
/* ------------------------------------------------------------------ */

export type ChatAttachment =
  | { kind: "video"; name: string; duration: string }
  | { kind: "link"; url: string; label: string };

export interface ChatMessage extends Message {
  attachments?: ChatAttachment[];
}

/** Canned clips so "attach video" feels like a real file picker in the demo. */
const DEMO_VIDEOS: { name: string; duration: string }[] = [
  { name: "set-3-trapbar-375.mp4", duration: "0:21" },
  { name: "pause-rep-check.mp4", duration: "0:33" },
  { name: "warmup-hip-flow.mp4", duration: "1:04" },
];

function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Main tabbed portal: coach chat + read-only announcements             */
/* ------------------------------------------------------------------ */

export function MessagesClient({
  athleteId,
  athleteName,
  participants,
  initialMessages,
  announcements,
}: {
  athleteId: string;
  athleteName: string;
  participants: ThreadParticipant[];
  initialMessages: ChatMessage[];
  announcements: Announcement[];
}) {
  return (
    <Tabs defaultValue="chat" className="flex flex-col gap-4">
      <TabsList className="w-fit">
        <TabsTrigger value="chat" className="gap-1.5">
          <MessagesSquare className="h-4 w-4" />
          Coach chat
        </TabsTrigger>
        <TabsTrigger value="announcements" className="gap-1.5">
          <Megaphone className="h-4 w-4" />
          Announcements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="mt-0">
        <CoachChat
          athleteId={athleteId}
          athleteName={athleteName}
          participants={participants}
          initialMessages={initialMessages}
        />
      </TabsContent>

      <TabsContent value="announcements" className="mt-0">
        <AnnouncementsFeed announcements={announcements} />
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1 — the single team channel with the whole coaching staff        */
/* ------------------------------------------------------------------ */

function CoachChat({
  athleteId,
  athleteName,
  participants,
  initialMessages,
}: {
  athleteId: string;
  athleteName: string;
  participants: ThreadParticipant[];
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [videoIdx, setVideoIdx] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = draft.trim().length > 0 || pending.length > 0;

  function send() {
    if (!canSend) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}-${Date.now()}`,
        senderId: athleteId,
        senderName: athleteName,
        senderRole: "athlete",
        body: draft.trim(),
        at: new Date().toISOString(),
        attachments: pending.length > 0 ? pending : undefined,
      },
    ]);
    setDraft("");
    setPending([]);
    setLinkOpen(false);
    setLinkDraft("");
  }

  function attachVideo() {
    const clip = DEMO_VIDEOS[videoIdx % DEMO_VIDEOS.length]!;
    setPending((prev) => [...prev, { kind: "video", ...clip }]);
    setVideoIdx((i) => i + 1);
  }

  function addLink() {
    const raw = linkDraft.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let label = url;
    try {
      label = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep full string as the label */
    }
    setPending((prev) => [...prev, { kind: "link", url, label }]);
    setLinkDraft("");
    setLinkOpen(false);
  }

  function removePending(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Team-channel header — any coach can message the athlete here */}
        <div className="flex flex-col gap-3 border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                LPS Coaching Staff
                <Pill tone="brand">Team channel</Pill>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                One conversation with the whole staff — any LPS coach can jump
                in and reply.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 py-1 pl-1 pr-2.5 text-xs font-medium"
              >
                <AthleteAvatar
                  initials={initialsFor(p.name)}
                  hue={hueFor(p.id)}
                  size="sm"
                  className="h-5 w-5 text-[0.5rem]"
                />
                {p.name}
                <span className="text-muted-foreground">
                  · {p.role === "athlete" ? "you" : p.role}
                </span>
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
              Parents/guardians can be added — required for minors
            </span>
          </div>
        </div>

        {/* Jordan is an adult, so this renders the compact permitted state */}
        <RuleOfTwoBanner participants={participants} />

        {/* Conversation */}
        <div
          ref={listRef}
          className="flex max-h-[480px] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface/30 p-4"
        >
          {messages.map((m) => {
            const mine = m.senderRole === "athlete";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-end gap-2.5",
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
                <div className={cn("max-w-[78%]", mine && "text-right")}>
                  {!mine ? (
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      {m.senderName}
                    </div>
                  ) : null}
                  {m.body ? (
                    <div
                      className={cn(
                        "inline-block rounded-2xl px-3.5 py-2 text-sm text-pretty",
                        mine
                          ? "rounded-br-sm bg-brand/15 text-foreground"
                          : "rounded-bl-sm border border-border bg-card",
                      )}
                    >
                      {m.body}
                    </div>
                  ) : null}
                  {m.attachments?.map((a, i) => (
                    <div key={i} className={cn("mt-1.5", mine && "text-right")}>
                      <AttachmentCard attachment={a} />
                    </div>
                  ))}
                  <div className="mt-1 text-[0.68rem] text-muted-foreground">
                    {relTime(m.at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer: text + video + link, chips preview before sending */}
        <div className="flex flex-col gap-2">
          {pending.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {pending.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-ink"
                >
                  {a.kind === "video" ? (
                    <Film className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-44 truncate">
                    {a.kind === "video" ? a.name : a.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    aria-label="Remove attachment"
                    className="opacity-70 transition-opacity hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {linkOpen ? (
            <div className="flex items-center gap-2">
              <Input
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="Paste a link — e.g. youtu.be/9xQp2sldyts"
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addLink}
                disabled={!linkDraft.trim()}
              >
                Add link
              </Button>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={attachVideo}
              title="Attach a video"
              aria-label="Attach a video"
            >
              <Film className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setLinkOpen((v) => !v)}
              title="Attach a link"
              aria-label="Attach a link"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message the coaching staff…"
            />
            <Button
              type="button"
              variant="brand"
              onClick={send}
              disabled={!canSend}
            >
              <SendHorizonal className="h-4 w-4" />
              Send
            </Button>
          </div>

          <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <BellRing className="h-3.5 w-3.5 shrink-0" />
            You&apos;ll get an email and push notification when a coach replies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Small media card for sent/received attachments. */
function AttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "video") {
    return (
      <span className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink">
          <Film className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">
            {attachment.name}
          </span>
          <span className="block text-[0.68rem] text-muted-foreground">
            Video · {attachment.duration}
          </span>
        </span>
      </span>
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-brand/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
        <Link2 className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">
          {attachment.label}
        </span>
        <span className="block max-w-56 truncate text-[0.68rem] text-muted-foreground">
          {attachment.url}
        </span>
      </span>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2 — read-only news feed                                          */
/* ------------------------------------------------------------------ */

function AnnouncementsFeed({ announcements }: { announcements: Announcement[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Megaphone className="h-4 w-4 shrink-0" />
        Read-only — announcements can&apos;t be replied to. The staff posts
        facility news here for every athlete.
      </div>

      {announcements.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex gap-4 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold text-pretty">{a.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {relTime(a.at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {a.body}
              </p>
              <p className="mt-2 text-xs font-medium text-foreground/70">
                {a.author} · LPS staff
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
