import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireUserWithProfile } from "@/lib/auth";
import { staffById } from "@/lib/demo/staff";
import { isStaff } from "@/lib/rbac";

import { StaffProfileForm } from "./staff-profile-form";

/**
 * The signed-in staff member's own profile — the "Profile tab" the client
 * flagged as missing on the coaching side. Self-service: contact, bio,
 * photo, notification preferences, plus a read-only view of their records.
 */
export default async function StaffProfilePage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const member = staffById(user.id);
  if (!member) redirect("/staff/athletes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your Profile"
        description="Contact details, bio and notifications — what athletes and the rest of the staff see about you."
      />
      {/* F1 — full-width like every other staff page (was max-w-2xl). */}
      <StaffProfileForm member={member} />
    </div>
  );
}
