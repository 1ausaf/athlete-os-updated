import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireUserWithProfile } from "@/lib/auth";
import { athletes, type AthleteStatus } from "@/lib/demo/data";
import { isAdmin, isStaff } from "@/lib/rbac";

import { MembersList } from "./members-list";

/**
 * Members — status tabs live in the URL (C8) and the add buttons are
 * admin-only links to the onboarding pages (C4/C10). Round 18 (C1): the
 * header summary pills are gone — the dropdowns and filters cover it.
 */
export default async function StaffAthletesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  // C8 — the status tab is shareable; ?status=paused deep-links the tab.
  const statusParam = searchParams?.status;
  const initialStatus: AthleteStatus =
    statusParam === "paused" || statusParam === "inactive"
      ? statusParam
      : "active";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Members"
        description="Every member by status — click a row to open the full profile: notes, program, billing, the lot."
      />

      <MembersList
        athletes={athletes}
        viewerStaffId={user.id}
        admin={isAdmin(user)}
        initialStatus={initialStatus}
      />
    </div>
  );
}
