import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireUserWithProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

import { TeamManager } from "./team-manager";

/**
 * Owner/admin staff manager (O1 + C23): access levels, coach profiles,
 * certifications and vulnerable-sector check records.
 */
export default async function StaffTeamPage() {
  const user = await requireUserWithProfile();
  if (!isAdmin(user)) redirect("/staff/athletes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Team"
        title="Team & access"
        description="Who's on staff, what they can do, and whether their records are current. Access levels apply immediately; certifications and vulnerable-sector checks are tracked per coach."
      />
      <TeamManager />
    </div>
  );
}
