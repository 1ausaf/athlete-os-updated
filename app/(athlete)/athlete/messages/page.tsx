import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ChevronRight, MessagesSquare, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, relTime, threads } from "@/lib/demo/data";

export default async function AthleteMessagesPage() {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;

  const myThreads = threads
    .filter((t) => t.participants.some((p) => p.id === athlete.id))
    .slice()
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));

  const unread = myThreads.reduce((n, t) => n + t.unread, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Messages"
        title="Inbox"
        description="Safe-Sport compliant messaging with your coaches. Any thread with a minor athlete keeps a second adult present — the Rule of Two."
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

      {myThreads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/30 p-4 text-sm text-muted-foreground">
          No conversations yet. When staff add you to a thread, it will appear
          here.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {myThreads.map((t) => {
            const last = t.messages[t.messages.length - 1];
            return (
              <Link key={t.id} href={`/athlete/messages/${t.id}` as Route}>
                <Card className="transition-colors hover:border-brand/40 hover:bg-accent/40">
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface/60 text-muted-foreground">
                      <MessagesSquare className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">
                          {t.subject}
                        </span>
                        {t.unread > 0 ? (
                          <Pill tone="brand">{t.unread} new</Pill>
                        ) : null}
                        {t.involvesMinor ? (
                          <Pill
                            tone="success"
                            icon={<ShieldCheck className="h-3 w-3" />}
                          >
                            Rule of Two
                          </Pill>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {last ? (
                          <>
                            <span className="font-medium text-foreground/80">
                              {last.senderName}:
                            </span>{" "}
                            {last.body}
                          </>
                        ) : (
                          "No messages yet"
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      {relTime(t.updatedAt)}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
