import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import {
  ClipboardCheck,
  ClipboardList,
  Contact,
  Dumbbell,
  LinkIcon,
  MessagesSquare,
  Phone,
  Users,
} from "lucide-react";

import {
  AvatarUpload,
  LinksEditor,
} from "@/app/(staff)/staff/athletes/[athleteId]/profile-panels";
import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { requireUserWithProfile } from "@/lib/auth";
import { threadIdForGroup } from "@/lib/demo/chat";
import { athleteById, type Athlete } from "@/lib/demo/data";
import {
  templateForProgramName,
  trainingGroupById,
} from "@/lib/demo/training";
import { isAdmin, isStaff } from "@/lib/rbac";

import {
  GroupDetailsCard,
  GroupManagementCard,
  GroupMembersCard,
  GroupNotesPanel,
} from "./group-panels";

/**
 * Round 8 (C21): the group profile MIRRORS the member profile — header is
 * avatar + "Group: {name}" with matching outline actions (no tag pills, no
 * coach icons); the left column stacks Details → Group Members → Contacts →
 * Links → Team Management; the right column carries the stat tiles and the
 * per-group Notes panel.
 */

/** C21 — group link rows default to the core external stack. */
const GROUP_DEFAULT_LINKS = [
  { label: "Drive", url: "https://drive.google.com" },
  { label: "Quo", url: "https://quo.com" },
  { label: "Brevo", url: "https://brevo.com" },
  { label: "Square", url: "https://squareup.com" },
];

export default async function StaffGroupProfilePage({
  params,
}: {
  params: { teamId: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const group = trainingGroupById(params.teamId);
  if (!group) notFound();

  const admin = isAdmin(user);

  const members = group.memberAthleteIds
    .map((id) => athleteById(id))
    .filter((a): a is Athlete => Boolean(a))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeContacts = group.contacts.filter((c) => c.active);
  const pastContacts = group.contacts.filter((c) => !c.active);
  const compliancePct = Math.round(
    (group.compliance.filled / Math.max(1, group.compliance.total)) * 100,
  );

  // R23 — Program opens the GROUP's own program template when it exists.
  const template = templateForProgramName(group.program);
  const programHref = template
    ? (`/staff/programming/templates/${template.id}` as Route)
    : ("/staff/programming" as Route);

  return (
    <div className="flex flex-col gap-6">
      {/* C21 — avatar + "Group: {name}" only; actions match the member page.
          R23: Assessment/Program/Chat deep-link to THIS group's pages, and
          the avatar carries a logo-upload affordance. */}
      <PageHeader
        eyebrow="Team Workspace · Group"
        title={
          <span className="flex items-center gap-3">
            <AvatarUpload
              initials={group.initials}
              hue={group.hue}
              name={group.name}
              uploadLabel="Upload logo (demo)"
            />
            Group: {group.name}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/teams/${group.id}/assessment` as Route}>
                <ClipboardCheck className="h-4 w-4" />
                Assessment
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={programHref}>
                <Dumbbell className="h-4 w-4" />
                Program
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/staff/messaging/${threadIdForGroup(group.id)}` as Route}>
                <MessagesSquare className="h-4 w-4" />
                Chat
              </Link>
            </Button>
          </>
        }
      />

      {/* Two columns like the member profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Left — Details → Group Members → Contacts → Links → Management */}
        <div className="flex flex-col gap-6">
          <GroupDetailsCard group={group} admin={admin} />

          {/* Group Members — R23: removable rows + add-existing select */}
          <GroupMembersCard group={group} admin={admin} />

          {/* Contacts — current first, past under a muted group */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <Contact className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Contacts</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {activeContacts.map((c) => (
                  <li
                    key={c.email}
                    className="rounded-lg border border-border bg-surface/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      <Pill tone="success">{c.role}</Pill>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                      <a
                        href={`mailto:${c.email}`}
                        className="font-mono underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {c.email}
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
              {pastContacts.length > 0 ? (
                <div>
                  {/* R23 — the client calls this bucket "Past members" */}
                  <span className="eyebrow">Past members</span>
                  <ul className="mt-2 flex flex-col gap-2">
                    {pastContacts.map((c) => (
                      <li
                        key={c.email}
                        className="rounded-lg border border-dashed border-border bg-muted/30 p-3 opacity-70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium">{c.name}</span>
                          <Pill tone="neutral">{c.role}</Pill>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">{c.phone}</span>
                          <span className="font-mono">{c.email}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Links — the same editable rows as the member profile (C21) */}
          <Card>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
                <h3 className="text-base">Links</h3>
              </div>
              <LinksEditor
                storageKey={`aos-links-${group.id}`}
                defaults={GROUP_DEFAULT_LINKS}
              />
            </CardContent>
          </Card>

          {/* Team Management — same selects as a member profile (C21) */}
          <GroupManagementCard group={group} />
        </div>

        {/* Right — stat tiles + the per-group notes panel */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile
              label="Weekly Log Rate"
              value={compliancePct}
              unit="%"
              icon={ClipboardList}
              hint={`${group.compliance.filled}/${group.compliance.total} sessions logged — ${group.program}`}
            />
            <StatTile
              label="Group Members"
              value={group.athleteCount}
              icon={Users}
              hint={`${members.length} with linked profiles`}
            />
          </div>

          <GroupNotesPanel
            groupId={group.id}
            groupName={group.name}
            authorName={user.fullName}
          />
        </div>
      </div>
    </div>
  );
}
