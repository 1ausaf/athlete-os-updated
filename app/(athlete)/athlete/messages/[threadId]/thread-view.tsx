"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/lib/demo/data";
import { relTime } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

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

export function ThreadView({
  athleteId,
  athleteName,
  initialMessages,
}: {
  athleteId: string;
  athleteName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");

  function send() {
    const body = draft.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}-${Date.now()}`,
        senderId: athleteId,
        senderName: athleteName,
        senderRole: "athlete",
        body,
        at: new Date().toISOString(),
      },
    ]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[520px] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface/30 p-4">
        {messages.map((m) => {
          const mine = m.senderId === athleteId;
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
                <div className="mt-1 text-[0.68rem] text-muted-foreground">
                  {relTime(m.at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
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
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="brand"
            onClick={send}
            disabled={!draft.trim()}
          >
            <SendHorizonal className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
