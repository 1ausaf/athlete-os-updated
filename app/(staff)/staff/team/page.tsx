import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

/** Placeholder — replaced by the staff access-level manager (W10). */
export default async function StaffTeamPage() {
  const user = await requireUserWithProfile();
  if (!isAdmin(user)) redirect("/staff/athletes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Team"
        title="Team & access"
        description="Coaching staff, access levels and records."
      />
    </div>
  );
}
