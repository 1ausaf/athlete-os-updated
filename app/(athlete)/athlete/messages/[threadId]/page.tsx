import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { RuleOfTwoBanner } from "@/components/app/rule-of-two";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { athleteById, threadById } from "@/lib/demo/data";

import { ThreadView } from "./thread-view";

export default async function AthleteThreadPage({
  params,
}: {
  params: { threadId: string };
}) {
  const user = await requireUserWithProfile();
  if (user.role !== "athlete") redirect("/staff/athletes");

  const athlete = athleteById(user.id) ?? athleteById("ath-jordan")!;
  const thread = threadById(params.threadId);
  if (!thread) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={"/athlete/messages" as Route}>
            <ArrowLeft className="h-4 w-4" />
            Inbox
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Athlete Portal · Messages"
        title={thread.subject}
        description={`${thread.participants.length} participants · ${
          thread.kind === "broadcast" ? "Facility broadcast" : "Direct thread"
        }`}
        actions={
          thread.involvesMinor ? (
            <Pill tone="success" dot>
              Rule of Two
            </Pill>
          ) : null
        }
      />

      <RuleOfTwoBanner participants={thread.participants} />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <ThreadView
            athleteId={athlete.id}
            athleteName={athlete.name}
            initialMessages={thread.messages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
