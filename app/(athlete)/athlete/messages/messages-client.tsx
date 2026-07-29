"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  Film,
  Link2,
  Megaphone,
  MessagesSquare,
  Paperclip,
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
import type { ChatAttachment, ChatMessage } from "@/lib/demo/chat";
import type { ThreadParticipant } from "@/lib/demo/data";
import { relTime } from "@/lib/demo/data";
import type { Announcement } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Demo-local message model lives in lib/demo/chat.ts (shared with the  */
/* dashboard preview) — re-exported here for existing importers.        */
/* ------------------------------------------------------------------ */

export type { ChatAttachment, ChatMessage } from "@/lib/demo/chat";

/** Canned items so the "Attach" button feels like a real file picker in the demo. */
const DEMO_ATTACHMENTS: ChatAttachment[] = [
  { kind: "video", name: "set-3-trapbar-375.mp4", duration: "0:21" },
  { kind: "file", name: "wk6-warmup-sheet.pdf" },
  { kind: "video", name: "pause-rep-check.mp4", duration: "0:33" },
  { kind: "file", name: "meet-day-checklist.docx" },
];

/**
 * WhatsApp-style link detection: http(s)://…, www.…, youtu.be/…, or a bare
 * domain.tld/path. Matched URLs are lifted out of the composer text and
 * turned into link-attachment chips automatically.
 */
const URL_RE =
  /\b(?:https?:\/\/\S+|www\.\S+|youtu\.be\/\S+|[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)*\.[a-z]{2,}\/\S*)/gi;

function toLinkAttachment(raw: string): ChatAttachment {
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let label = url;
  try {
    label = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep full string as the label */
  }
  return { kind: "link", url, label };
}

/** Pull URLs out of free text; returns the leftover text + the found URLs. */
function extractUrls(text: string): { rest: string; urls: string[] } {
  const urls: string[] = [];
  const rest = text
    .replace(URL_RE, (match) => {
      urls.push(match.replace(/[.,!?;:)\]]+$/, ""));
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();
  return { rest, urls };
}

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
/* Main tabbed portal: team chat + read-only announcements              */
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
          Chat
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
  const [attachIdx, setAttachIdx] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = draft.trim().length > 0 || pending.length > 0;

  function send() {
    if (!canSend) return;
    // Auto-linkify on send: any URL still sitting in the text becomes a
    // link-attachment chip, WhatsApp-style.
    const { rest, urls } = extractUrls(draft.trim());
    const attachments = [...pending, ...urls.map(toLinkAttachment)];
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}-${Date.now()}`,
        senderId: athleteId,
        senderName: athleteName,
        senderRole: "athlete",
        body: rest,
        at: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    ]);
    setDraft("");
    setPending([]);
    setLinkOpen(false);
    setLinkDraft("");
  }

  /** Auto-linkify on paste: URLs become chips, leftover text stays editable. */
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const { rest, urls } = extractUrls(text);
    if (urls.length === 0) return;
    e.preventDefault();
    setPending((prev) => [...prev, ...urls.map(toLinkAttachment)]);
    if (rest) setDraft((d) => (d ? `${d} ${rest}` : rest));
  }

  function attachDemoFile() {
    const item = DEMO_ATTACHMENTS[attachIdx % DEMO_ATTACHMENTS.length]!;
    setPending((prev) => [...prev, item]);
    setAttachIdx((i) => i + 1);
  }

  function addLink() {
    const raw = linkDraft.trim();
    if (!raw) return;
    setPending((prev) => [...prev, toLinkAttachment(raw)]);
    setLinkDraft("");
    setLinkOpen(false);
  }

  function removePending(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  }

  /** Drag & drop anywhere on the conversation card attaches the file (demo). */
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    setPending((prev) => [
      ...prev,
      { kind: "file", name: dropped?.name ?? "dropped-file.pdf" },
    ]);
  }

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
        }
      }}
      onDrop={handleDrop}
      className={cn(
        "transition-shadow",
        dragOver && "border-brand/50 ring-2 ring-brand/30",
      )}
    >
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
          <NotificationRoster participants={participants} />
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
                  ) : a.kind === "file" ? (
                    <Paperclip className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-44 truncate">
                    {a.kind === "link" ? a.label : a.name}
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
              size="sm"
              onClick={attachDemoFile}
              className="gap-1.5 px-2.5"
              title="Attach a photo or video — or drag & drop into the chat"
              aria-label="Attach a photo or video — or drag and drop into the chat"
            >
              <Paperclip className="h-4 w-4" />
              <span className="hidden sm:inline">Attach</span>
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
              onPaste={handlePaste}
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
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            Paste any link — it attaches automatically.
          </p>

          <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <BellRing className="h-3.5 w-3.5 shrink-0" />
            You&apos;ll get an email and push notification when a coach replies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Notification roster — who gets pinged vs. who can merely view        */
/* ------------------------------------------------------------------ */

const NOTIFY_ORDER: Record<ThreadParticipant["role"], number> = {
  athlete: 0,
  admin: 1,
  coach: 2,
  guardian: 3,
};

function notifyRoleLabel(role: ThreadParticipant["role"]): string {
  switch (role) {
    case "athlete":
      return "you · client";
    case "admin":
      return "admin";
    case "coach":
      return "main coach";
    default:
      return role;
  }
}

/**
 * Client feedback: only the people managing this client get notified —
 * not every coach. Everyone else can still read the chat, and any coach
 * can subscribe themselves to notifications (Coach Nadia already has).
 */
function NotificationRoster({
  participants,
}: {
  participants: ThreadParticipant[];
}) {
  const [selfSubscribed, setSelfSubscribed] = useState(false);

  // Coach Nadia posts in the thread but isn't assigned to this client —
  // she added herself to the notification list, the model for any coach.
  const subscribed = participants.filter((p) => p.id === "coach-nadia");
  const notified = participants
    .filter((p) => p.id !== "coach-nadia")
    .slice()
    .sort((a, b) => (NOTIFY_ORDER[a.role] ?? 9) - (NOTIFY_ORDER[b.role] ?? 9));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <BellRing className="h-3.5 w-3.5 shrink-0 text-brand-ink" />
        Notifications go to
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {notified.map((p) => (
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
              · {notifyRoleLabel(p.role)}
            </span>
            <Bell className="h-3 w-3 shrink-0 text-brand-ink" />
          </span>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0" />
        All LPS team members can view this chat.
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {subscribed.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 py-1 pl-1 pr-2.5 text-xs font-medium"
          >
            <AthleteAvatar
              initials={initialsFor(p.name)}
              hue={hueFor(p.id)}
              size="sm"
              className="h-5 w-5 text-[0.5rem]"
            />
            {p.name}
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-3 w-3 shrink-0" />
              Subscribed
            </span>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setSelfSubscribed((v) => !v)}
          aria-pressed={selfSubscribed}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            selfSubscribed
              ? "border-success/30 bg-success/10 text-success"
              : "border-dashed border-border text-muted-foreground hover:border-brand/40 hover:text-foreground",
          )}
        >
          {selfSubscribed ? (
            <>
              <Check className="h-3 w-3 shrink-0" />
              You&apos;ll be notified
            </>
          ) : (
            <>
              <Bell className="h-3 w-3 shrink-0" />+ Subscribe to notifications
            </>
          )}
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
          <UserPlus className="h-3.5 w-3.5 shrink-0" />
          Parents/guardians can be added — required for minors
        </span>
      </div>
    </div>
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
  if (
    attachment.kind === "file" ||
    attachment.kind === "image" ||
    attachment.kind === "voice"
  ) {
    return (
      <span className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink">
          <Paperclip className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">
            {attachment.name}
          </span>
          <span className="block text-[0.68rem] text-muted-foreground">
            {attachment.kind === "image"
              ? "Photo"
              : attachment.kind === "voice"
                ? `Voice note · ${attachment.duration}`
                : "File attachment"}
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
