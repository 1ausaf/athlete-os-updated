import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { parentAccountById } from "@/lib/demo/data";
import { requireAthleteContext } from "@/lib/demo/session";

import { ParentProfileForm } from "./parent-profile-form";

/**
 * P3 — the parent's OWN profile, separate from the kids' profiles. What's
 * saved here feeds the coach-side card contacts and auto-fills the parent
 * section on each minor's profile.
 */
export default async function ParentProfilePage() {
  const ctx = requireAthleteContext();
  if (!ctx.isParentView) redirect("/athlete/dashboard");

  const account = parentAccountById(ctx.user.id);
  if (!account) redirect("/athlete/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Member Portal · Parent"
        title="My Profile"
        description="Your own contact card — separate from your kids' profiles. What you save here auto-fills each child's parent section for the coaching staff."
      />
      {/* Round 8 (P5): full width, like every other profile page — the form
          lays its cards out in a two-column grid on large screens. */}
      <ParentProfileForm
        account={account}
        kids={ctx.children.map((c) => ({
          id: c.id,
          name: c.name,
          initials: c.initials,
          hue: c.hue,
          sport: c.sport,
        }))}
      />
    </div>
  );
}
