"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Film,
  ImageIcon,
  Link2,
  Megaphone,
  Paperclip,
  ShieldCheck,
  Users,
} from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { RuleOfTwoBanner } from "@/components/app/rule-of-two";
import {
  ChatComposer,
  renderChatBody,
  VoiceNoteBubble,
} from "@/components/app/chat-composer";
import { TabBar } from "@/components/app/tab-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
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
/* Main tabbed portal: team chat + read-only announcements              */
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
  initialTab = "chat",
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
  initialTab?: MessagesTab;
}) {
  const [tab, setTab] = useState<MessagesTab>(initialTab);

  return (
    <div className="flex flex-col gap-4">
      <TabBar<MessagesTab>
        tabs={[
          { value: "chat", label: "Chat" },
          { value: "announcements", label: "Announcements" },
        ]}
        active={tab}
        onSelect={setTab}
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
        />
      ) : (
        <AnnouncementsFeed announcements={announcements} />
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
}: {
  athleteId: string;
  athleteName: string;
  isMinor: boolean;
  isParentView: boolean;
  parentName: string | null;
  participants: ThreadParticipant[];
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

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
        {/* Team-channel header — presubscribed, no roster block (A11) */}
        <div className="flex flex-col gap-2 border-b border-border pb-4">
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
                Your coaching staff sees this chat — any LPS coach can jump in
                and reply, and you&apos;re notified when they do.
              </p>
            </div>
          </div>
        </div>

        {/* Safe-Sport status: minors get the Rule-of-Two note, adults the
            compact permitted state. Never the adult line for a minor. */}
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
        ) : (
          <RuleOfTwoBanner participants={participants} />
        )}

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
                  <div className="mt-1 text-[0.68rem] text-muted-foreground">
                    {relTime(m.at)}
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
          hint="Ctrl+Enter or Send"
        />
      </CardContent>
    </Card>
  );
}

/** Media card for sent/received attachments (photos, video, voice, files). */
function AttachmentCard({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === "voice") {
    return <VoiceNoteBubble duration={attachment.duration} />;
  }
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
        <a
          href={DEMO_DOWNLOAD_URI}
          download={attachment.name}
          aria-label={`Download ${attachment.name}`}
          title="Download video (demo)"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </span>
    );
  }
  if (attachment.kind === "image") {
    return (
      <span className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-ink">
          <ImageIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">
            {attachment.name}
          </span>
          <span className="block text-[0.68rem] text-muted-foreground">
            Photo
          </span>
        </span>
        <a
          href={DEMO_DOWNLOAD_URI}
          download={attachment.name}
          aria-label={`Download ${attachment.name}`}
          title="Download photo (demo)"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand-ink"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </span>
    );
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
