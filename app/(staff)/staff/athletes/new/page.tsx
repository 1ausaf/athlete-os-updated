import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes } from "@/lib/demo/data";
import { trainingGroups } from "@/lib/demo/training";
import { isAdmin, isStaff } from "@/lib/rbac";

import { NewMemberForm } from "./new-member-form";

/**
 * Round 8 (C4/C10): Add Member is a dedicated full-page onboarding — contact
 * details, goals, injury history, parent + emergency contacts. Submitting
 * creates the member's login with a generated temporary password. Admin+
 * only; ?group={id} preselects the group (the group profile links here).
 */
export default async function NewMemberPage({
  searchParams,
}: {
  searchParams?: { group?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  if (!isAdmin(user)) redirect("/staff/athletes");

  const focusOptions = Array.from(
    new Set([...athletes.map((a) => a.sport), ...trainingGroups.map((g) => g.focus)]),
  ).sort();
  const groups = trainingGroups.map((g) => ({ id: g.id, name: g.name }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team Workspace · Members"
        title="Add Member"
        description="Full onboarding — identity, contacts, goals and injury history. Submitting creates the member's login."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/athletes" as Route}>← All members</Link>
          </Button>
        }
      />
      <NewMemberForm
        focusOptions={focusOptions}
        groups={groups}
        initialGroupId={searchParams?.group ?? ""}
      />
    </div>
  );
}
