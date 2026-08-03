import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes } from "@/lib/demo/data";
import { trainingGroups } from "@/lib/demo/training";
import { isAdmin, isStaff } from "@/lib/rbac";

import { NewGroupForm } from "./new-group-form";

/**
 * Round 8 (C4/C10): Add Group — the group twin of the member onboarding page.
 * Name, focus, membership type, plan, contacts and coaches; same success
 * pattern as Add Member. Admin+ only.
 */
export default async function NewGroupPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");
  if (!isAdmin(user)) redirect("/staff/athletes");

  const focusOptions = Array.from(
    new Set([...athletes.map((a) => a.sport), ...trainingGroups.map((g) => g.focus)]),
  ).sort();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Team Workspace · Members"
        title="Add Group"
        description="A group trains as one — one plan, one program, shared contacts and coaches. Members link their own profiles underneath."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={"/staff/athletes" as Route}>← All members</Link>
          </Button>
        }
      />
      <NewGroupForm focusOptions={focusOptions} />
    </div>
  );
}
