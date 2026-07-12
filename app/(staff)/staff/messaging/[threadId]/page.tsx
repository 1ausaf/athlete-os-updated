import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RuleOfTwoBanner } from "@/components/app/rule-of-two";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { fmtDay, threadById } from "@/lib/demo/data";

import { ThreadConversation } from "./thread-conversation";

interface PageProps {
  params: { threadId: string };
}

export default async function StaffThreadPage({ params }: PageProps) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const thread = threadById(params.threadId);
  if (!thread) notFound();

  const isBroadcast = thread.kind === "broadcast";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Messaging"
        title={thread.subject}
        description={`Started ${fmtDay(thread.messages[0]?.at ?? thread.updatedAt)} · ${thread.participants
          .map((p) => p.name)
          .join(", ")}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/messaging" as Route}>
              <ArrowLeft className="h-4 w-4" />
              Inbox
            </Link>
          </Button>
        }
      />

      {isBroadcast ? (
        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/[0.06] px-3 py-2 text-xs text-info">
          <Megaphone className="h-4 w-4 shrink-0" />
          Broadcast announcement — sent to all athletes. Replies route privately
          to staff.
        </div>
      ) : (
        <RuleOfTwoBanner participants={thread.participants} />
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow">Participants</span>
            {thread.participants.map((p) => (
              <Pill
                key={p.id}
                tone={p.role === "coach" ? "brand" : "neutral"}
              >
                {p.name}
                <span className="opacity-60">· {p.role}</span>
              </Pill>
            ))}
          </div>

          <ThreadConversation
            initialMessages={thread.messages}
            participants={thread.participants}
          />
        </CardContent>
      </Card>
    </div>
  );
}
