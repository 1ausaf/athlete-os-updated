"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Download,
  Film,
  ImageIcon,
  Link2,
  Megaphone,
  Paperclip,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import {
  ChatComposer,
  renderChatBody,
  VoiceNoteBubble,
} from "@/components/app/chat-composer";
import { ANNOUNCEMENT_READ_KEY } from "@/components/nav/athlete-nav";
import { TabBar } from "@/components/app/tab-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  ANN_STORE_EVENT,
  memberAnnouncementFeed,
} from "@/lib/demo/announcements-store";
import type { ChatAttachment, ChatMessage } from "@/lib/demo/chat";
import type { ThreadParticipant } from "@/lib/demo/data";
import { relTime } from "@/lib/demo/data";
import type { Announcement } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

import { readSessionFeedback } from "../session-feedback";

/**
 * Round 8 (M31): bubble timestamps — a bare time for today's messages,
 * "August 2, 2026 at 3:43 PM" for anything older.
 */
function stampFor(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return time;
  const day = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${day} at ${time}`;
}

/* ------------------------------------------------------------------ */
/* Demo-local message model lives in lib/demo/chat.ts (shared with the  */
/* dashboard preview) — re-exported here for existing importers.        */
/* ------------------------------------------------------------------ */

export type { ChatAttachment, ChatMessage } from "@/lib/demo/chat";

/** Tiny valid data URI so the mock Download affordance actually downloads. */
const DEMO_DOWNLOAD_URI = "data:application/octet-stream;base64,QU9TIGRlbW8=";

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
/* Round 10 (R6): the TAB split returns — announcements got long, so    */
/* Chat (default, first) and Announcements live on separate tabs. The   */
/* tab is URL-backed (?tab=announcements) so deep links land right.     */
/* ------------------------------------------------------------------ */

type MessagesTab = "chat" | "announcements";

export function MessagesClient({
  athleteId,
  athleteName,
  isMinor,
  isParentView,
  parentName,
  participants,
  initialMessages,
  announcements,
  unread,
  channelName,
}: {
  athleteId: string;
  athleteName: string;
  isMinor: boolean;
  /** A parent is managing this athlete — sends carry the PARENT's name (P5). */
  isParentView: boolean;
  parentName: string | null;
  participants: ThreadParticipant[];
  initialMessages: ChatMessage[];
  announcements: Announcement[];
  /** Unread chat count — the pill sits in the tab row now (M2). */
  unread: number;
  /** Round 11 (M21): member-facing channel title from channelDisplayNameFor. */
  channelName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<MessagesTab>(() =>
    searchParams.get("tab") === "announcements" ? "announcements" : "chat",
  );

  // Round 11 (M28): the server passes the hydration-stable published list;
  // after mount the archive-aware store takes over, re-reading whenever a
  // staff surface posts or archives (ANN_STORE_EVENT) so the feed is live.
  const [feed, setFeed] = useState<Announcement[]>(announcements);
  useEffect(() => {
    const refresh = () => setFeed(memberAnnouncementFeed());
    refresh();
    window.addEventListener(ANN_STORE_EVENT, refresh);
    return () => window.removeEventListener(ANN_STORE_EVENT, refresh);
  }, []);

  function selectTab(t: MessagesTab) {
    setTab(t);
    // Round 11 (M1): PUSH so Back restores the previous tab; pathname-based
    // so the parent persona keeps its /parent/* address space.
    const current: MessagesTab =
      searchParams.get("tab") === "announcements" ? "announcements" : "chat";
    if (t === current) return;
    router.push(
      (t === "announcements"
        ? `${pathname}?tab=announcements`
        : pathname) as Route,
      { scroll: false },
    );
  }

  // Round 11 (M1): the URL is the source of truth — Back/Forward while the
  // component stays mounted must re-derive the tab from searchParams.
  useEffect(() => {
    setTab(
      searchParams.get("tab") === "announcements" ? "announcements" : "chat",
    );
  }, [searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <TabBar<MessagesTab>
        tabs={[
          { value: "chat", label: "Chat" },
          {
            value: "announcements",
            label: "Announcements",
            count: feed.length,
          },
        ]}
        active={tab}
        onSelect={selectTab}
        right={
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

      {tab === "chat" ? (
        <CoachChat
          athleteId={athleteId}
          athleteName={athleteName}
          isMinor={isMinor}
          isParentView={isParentView}
          parentName={parentName}
          participants={participants}
          initialMessages={initialMessages}
          channelName={channelName}
        />
      ) : (
        <AnnouncementsFeed announcements={feed} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1 — the single team channel with the whole coaching staff        */
/* ------------------------------------------------------------------ */

function CoachChat({
  athleteId,
  athleteName,
  isMinor,
  isParentView,
  parentName,
  participants,
  initialMessages,
  channelName,
}: {
  athleteId: string;
  athleteName: string;
  isMinor: boolean;
  isParentView: boolean;
  parentName: string | null;
  participants: ThreadParticipant[];
  initialMessages: ChatMessage[];
  /** "You & The LPS Athletic Team" (or with the group's name) — M21. */
  channelName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Round 10 (R9): merge queued "Session Feedback: …" notes from the workout
  // logger (a tiny localStorage queue) into the thread as athlete messages.
  useEffect(() => {
    const entries = readSessionFeedback(athleteId);
    if (entries.length === 0) return;
    setMessages((prev) => {
      const have = new Set(prev.map((m) => m.id));
      const merged: ChatMessage[] = entries
        .map((e) => ({
          id: `feedback-${e.at}`,
          senderId: athleteId,
          senderName: athleteName,
          senderRole: "athlete" as const,
          body: e.body,
          at: e.at,
        }))
        .filter((m) => !have.has(m.id));
      if (merged.length === 0) return prev;
      return [...prev, ...merged].sort((a, b) => a.at.localeCompare(b.at));
    });
  }, [athleteId, athleteName]);

  function send(body: string, attachments: ChatAttachment[]) {
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}-${Date.now()}`,
        // P5: while a parent manages a child, the message is FROM the parent
        // — name + a "Parent" chip — so coaches know exactly who's typing.
        senderId: isParentView ? "guardian-local" : athleteId,
        senderName: isParentView ? (parentName ?? "Parent") : athleteName,
        senderRole: isParentView ? "guardian" : "athlete",
        body,
        at: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    ]);
  }

  /** Right-side ("mine") bubbles: whoever is typing on this device. */
  function isMine(m: ChatMessage): boolean {
    if (isParentView) {
      return m.senderRole === "guardian" && (parentName == null || m.senderName === parentName);
    }
    return m.senderRole === "athlete";
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Team-channel header — presubscribed, no roster block (A11).
            Round 11 (M21–M23): just the member-facing title — the "Team
            channel" pill and the who-sees-this sub-line are gone. */}
        <div className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0 font-semibold text-pretty">
              {channelName}
            </div>
          </div>
        </div>

        {/* Round 7: minors keep the Rule-of-Two note; adults get NOTHING —
            the "direct 1:1 permitted" line is gone. */}
        {isMinor ? (
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/[0.06] px-3 py-2.5 text-xs">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              aria-hidden
            />
            <span className="min-w-0 text-pretty text-muted-foreground">
              <span className="font-semibold text-success">
                Safe-Sport Rule of Two
              </span>{" "}
              — a parent/guardian and the coaching staff are always in this
              chat, so it can never become a private 1:1 with a minor.
            </span>
          </div>
        ) : null}

        {/* Conversation */}
        <div
          ref={listRef}
          className="flex max-h-[480px] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface/30 p-4"
        >
          {messages.length === 0 ? (
            <p className="m-auto max-w-xs py-8 text-center text-sm text-muted-foreground text-pretty">
              No messages yet — say hi. Your whole coaching staff is here.
            </p>
          ) : null}
          {messages.map((m) => {
            const mine = isMine(m);
            const fromParent = m.senderRole === "guardian";
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
                  {!mine || fromParent ? (
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
                        mine && "justify-end",
                      )}
                    >
                      {m.senderName}
                      {fromParent ? (
                        <Pill tone="info" className="px-1.5 py-0 text-[0.62rem]">
                          Parent
                        </Pill>
                      ) : null}
                    </div>
                  ) : null}
                  {m.body ? (
                    <div
                      className={cn(
                        "inline-block rounded-2xl px-3.5 py-2 text-left text-sm text-pretty",
                        mine
                          ? "rounded-br-sm bg-brand/15 text-foreground"
                          : "rounded-bl-sm border border-border bg-card",
                      )}
                    >
                      {renderChatBody(m.body)}
                    </div>
                  ) : null}
                  {m.attachments?.map((a, i) => (
                    <div key={i} className={cn("mt-1.5", mine && "text-right")}>
                      <AttachmentCard attachment={a} />
                    </div>
                  ))}
                  {/* Round 8 (M31): today = time only; older = full date */}
                  <div className="mt-1 text-[0.68rem] text-muted-foreground">
                    {stampFor(m.at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Round 5 (A13): shared WhatsApp-style composer — multiline, bold /
            italic, image + video attach, voice notes. */}
        <ChatComposer
          placeholder={
            isParentView
              ? `Message the coaching staff as ${parentName ?? "parent"}…`
              : "Message the coaching staff… (Enter for a new line)"
          }
          onSend={send}
          // Round 11 (M25): the word "Send" became the send icon.
          hint={
            <>
              Ctrl+Enter or{" "}
              <Send
                className="inline h-3 w-3 align-[-0.08em]"
                role="img"
                aria-label="Send"
              />
            </>
          }
        />
      </CardContent>
    </Card>
  );
}

/** Media card for sent/received attachments (photos, video, voice, files). */
/**
 * Round 7: "clicking on a video would be nice to be able to play or see a
 * preview" — the card expands into an inline mock player.
 */
function VideoAttachmentCard({
  name,
  duration,
}: {
  name: string;
  duration: string;
}) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <span className="block max-w-full">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (open) setPlaying(false);
        }}
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "Show"} preview of ${name}`}
        className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-brand/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink">
          <Film className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">{name}</span>
          <span className="block text-[0.68rem] text-muted-foreground">
            Video · {duration} · {open ? "hide preview" : "tap to preview"}
          </span>
        </span>
        <a
          href={DEMO_DOWNLOAD_URI}
          download={name}
          aria-label={`Download ${name}`}
          title="Download video (demo)"
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </button>

      {open ? (
        <span className="mt-2 block overflow-hidden rounded-xl border border-border bg-black">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause video" : "Play video"}
            className="relative flex aspect-video w-full items-center justify-center"
          >
            {/* Demo player — a real deployment streams the uploaded file. */}
            <span
              className={cn(
                "absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",
                playing && "animate-pulse",
              )}
              aria-hidden
            />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-transform hover:scale-105">
              {playing ? (
                <span className="flex gap-1" aria-hidden>
                  <span className="h-4 w-1.5 rounded-sm bg-white" />
                  <span className="h-4 w-1.5 rounded-sm bg-white" />
                </span>
              ) : (
                <span
                  className="ml-1 border-y-8 border-l-[14px] border-y-transparent border-l-white"
                  aria-hidden
                />
              )}
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
              {playing ? "Playing (demo)" : duration}
            </span>
          </button>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Round 8 (M29): image attachments read as photo thumbnails — a gradient
 * placeholder (the demo has no real uploads) with the filename overlaid and
 * the download affordance kept in the corner.
 */
function ImageAttachmentCard({ name }: { name: string }) {
  const h = hueFor(name);
  return (
    <span className="relative inline-block h-32 w-44 max-w-full overflow-hidden rounded-xl border border-border align-top">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, hsl(${h} 62% 58%), hsl(${(h + 70) % 360} 55% 38%))`,
        }}
      />
      <ImageIcon
        className="absolute left-1/2 top-[42%] h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-white/60"
        aria-hidden
      />
      <a
        href={DEMO_DOWNLOAD_URI}
        download={name}
        aria-label={`Download ${name}`}
        title="Download photo (demo)"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-4 text-left text-[0.68rem] font-medium text-white">
        {name}
      </span>
    </span>
  );
}

function AttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "voice") {
    return <VoiceNoteBubble duration={attachment.duration} />;
  }
  if (attachment.kind === "video") {
    return (
      <VideoAttachmentCard
        name={attachment.name}
        duration={attachment.duration}
      />
    );
  }
  if (attachment.kind === "image") {
    return <ImageAttachmentCard name={attachment.name} />;
  }
  if (attachment.kind === "file") {
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
            File attachment
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
/* Announcements tab — full-height list with FULL bodies, links and     */
/* images (R6), read/unread state kept (M33), #ann-{id} anchors for the */
/* dashboard deep links (R5).                                           */
/* ------------------------------------------------------------------ */

/**
 * Round 10 (R6): announcements that carry an image render a placeholder
 * media block (the demo has no real uploads). Keyed by announcement id.
 */
const ANNOUNCEMENT_IMAGES: Record<string, string> = {
  "ann-1": "front-desk-holiday-hours.jpg",
};

/** Round 11 (M26): announcements page in — latest 5, then +5 per click. */
const ANN_PAGE_SIZE = 5;

function AnnouncementsFeed({ announcements }: { announcements: Announcement[] }) {
  // Round 8 (M33): read ids persist in localStorage; the nav Chat badge
  // listens for the change event and recounts.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ANN_PAGE_SIZE);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(ANNOUNCEMENT_READ_KEY) ?? "[]",
      ) as string[];
      setReadIds(new Set(stored));
    } catch {
      // Corrupt storage — treat everything as unread.
    }
  }, []);

  // Round 10 (R5): dashboard rows deep-link to #ann-{id} — once the tab is
  // mounted, scroll the anchored announcement into view.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("ann-")) return;
    requestAnimationFrame(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  function persist(next: Set<string>) {
    setReadIds(next);
    try {
      window.localStorage.setItem(
        ANNOUNCEMENT_READ_KEY,
        JSON.stringify([...next]),
      );
    } catch {
      // Storage unavailable — read state stays session-local.
    }
    window.dispatchEvent(new Event("aos-ann-read-changed"));
  }

  function markRead(id: string) {
    if (readIds.has(id)) return;
    persist(new Set([...readIds, id]));
  }

  function markAllRead() {
    persist(new Set(announcements.map((a) => a.id)));
  }

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;
  const visible = announcements.slice(0, visibleCount);
  const remaining = Math.max(0, announcements.length - visible.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Megaphone className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base">Announcements</h2>
        {unreadCount > 0 ? (
          <Pill tone="brand" dot>
            <span className="tnum">{unreadCount} unread</span>
          </Pill>
        ) : null}
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Megaphone className="h-4 w-4 shrink-0" />
        Read-only — announcements can&apos;t be replied to. The staff posts
        facility news here for every athlete.
      </div>

      {visible.map((a) => {
        const unread = !readIds.has(a.id);
        const image = ANNOUNCEMENT_IMAGES[a.id];
        return (
          <Card
            key={a.id}
            id={`ann-${a.id}`}
            role="button"
            tabIndex={0}
            aria-label={
              unread ? `${a.title} — unread, tap to mark read` : a.title
            }
            onClick={() => markRead(a.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                markRead(a.id);
              }
            }}
            className={cn(
              "scroll-mt-24 cursor-pointer transition-colors",
              unread ? "border-brand/40" : "hover:bg-accent/30",
            )}
          >
            <CardContent className="flex gap-3 p-4">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
                <Megaphone className="h-4 w-4" />
                {unread ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-brand"
                    title="Unread"
                  />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "text-sm text-pretty",
                      unread ? "font-bold" : "font-semibold",
                    )}
                  >
                    {a.title}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {relTime(a.at)}
                  </span>
                </div>
                {/* Round 10 (R6): the FULL body — long announcements welcome;
                    URLs linkify via the shared chat renderer. */}
                <div className="mt-1 text-sm text-pretty text-muted-foreground">
                  {renderChatBody(a.body)}
                </div>
                {image ? (
                  <span className="relative mt-3 block h-40 w-full max-w-md overflow-hidden rounded-xl border border-border">
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hueFor(image)} 62% 58%), hsl(${(hueFor(image) + 70) % 360} 55% 38%))`,
                      }}
                    />
                    <ImageIcon
                      className="absolute left-1/2 top-[42%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white/60"
                      aria-hidden
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-5 text-left text-[0.7rem] font-medium text-white">
                      {image} · demo image — production shows the upload
                    </span>
                  </span>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-foreground/70">
                    {a.author} · LPS staff
                  </p>
                  {unread ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(a.id);
                      }}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-ink transition-opacity hover:opacity-80"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Round 11 (M26): +5 per click, remaining count in the label */}
      {remaining > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-center"
          onClick={() => setVisibleCount((c) => c + ANN_PAGE_SIZE)}
        >
          Show more ({remaining} more)
        </Button>
      ) : null}
    </div>
  );
}
