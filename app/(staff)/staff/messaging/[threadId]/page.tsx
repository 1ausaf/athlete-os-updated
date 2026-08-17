import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/rbac";
import { athleteById, fmtDay, threadById } from "@/lib/demo/data";
import {
  assignedStaffIds,
  assignmentsForAthlete,
  COACH_ROLE_LABEL,
  staffMembers,
} from "@/lib/demo/staff";

import { ThreadConversation } from "./thread-conversation";

interface PageProps {
  params: { threadId: string };
}

export default async function StaffThreadPage({ params }: PageProps) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  const admin = isAdmin(user);

  const thread = threadById(params.threadId);
  if (!thread) notFound();

  const isBroadcast = thread.kind === "broadcast";

  // C20: involvement follows coach assignments for the thread's athlete.
  const athleteParticipant = thread.participants.find(
    (p) => p.role === "athlete" && athleteById(p.id),
  );
  const assignment = athleteParticipant
    ? assignmentsForAthlete(athleteParticipant.id).find(
        (a) => a.staffId === user.id,
      )
    : undefined;
  const involved = isBroadcast
    ? true
    : athleteParticipant
      ? assignedStaffIds(athleteParticipant.id).has(user.id)
      : false;
  const canPost = involved || admin;

  // X5 — the @ picker offers everyone in the thread plus the whole staff
  // roster (deduped, minus yourself).
  const mentionNames = Array.from(
    new Set([
      ...thread.participants.map((p) => p.name),
      ...staffMembers.map((s) => s.name),
    ]),
  ).filter((n) => n !== user.fullName);

  return (
    // C35: the thread fills the screen to the bottom — the message pane
    // stretches, scrolls internally, and the composer pins at the bottom.
    // R34: iPhone got a too-short window — dvh sizing (with a vh fallback)
    // plus a 70dvh floor keeps the message area usably tall on mobile.
    <div className="flex min-h-[70dvh] h-[calc(100vh-7rem)] supports-[height:100dvh]:h-[calc(100dvh-7rem)] flex-col gap-4 md:h-[calc(100vh-9rem)] md:supports-[height:100dvh]:h-[calc(100dvh-9rem)]">
      <PageHeader
        title={thread.subject}
        description={`Started ${fmtDay(thread.messages[0]?.at ?? thread.updatedAt)} · ${thread.participants
          .map((p) => p.name)
          .join(", ")}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/messaging" as Route}>
              <ArrowLeft className="h-4 w-4" />
              Chats
            </Link>
          </Button>
        }
      />

      {/* R8 (H3): the Rule-of-Two banner is gone — the admin auto-adds
          parents on every minor's chat, so there's nothing to police here. */}
      {isBroadcast ? (
        <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/[0.06] px-3 py-2 text-xs text-info">
          <Megaphone className="h-4 w-4 shrink-0" />
          Broadcast announcement — sent to all members. Replies route privately
          to staff.
        </div>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          {/* R34 — hidden on phones: the header already lists everyone and
              every pixel goes to the message area. */}
          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
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
            {assignment ? (
              <Pill tone="brand" className="ml-auto">
                You · {COACH_ROLE_LABEL[assignment.role]}
              </Pill>
            ) : admin && !isBroadcast ? (
              <Pill tone="info" className="ml-auto">
                Admin oversight
              </Pill>
            ) : null}
          </div>

          <ThreadConversation
            initialMessages={thread.messages}
            participants={thread.participants}
            mentionNames={mentionNames}
            me={{
              id: user.id,
              name: user.fullName,
              role: admin ? "admin" : "coach",
            }}
            canPost={canPost}
            canDelete={admin}
            canJoin={!canPost}
          />
        </CardContent>
      </Card>
    </div>
  );
}
