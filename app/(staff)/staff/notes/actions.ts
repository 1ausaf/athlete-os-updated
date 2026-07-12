"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserWithProfile } from "@/lib/auth";
import { createStaffCapNoteForUser } from "@/lib/server/mutations";
import { isStaff } from "@/lib/rbac";

export async function createCapNoteAction(formData: FormData) {
  const user = await getCurrentUserWithProfile();
  if (!user || !isStaff(user)) {
    redirect("/athlete/dashboard");
  }

  const athleteProfileId = String(formData.get("athleteProfileId") ?? "").trim();
  const context = String(formData.get("context") ?? "");
  const action = String(formData.get("action") ?? "");
  const plan = String(formData.get("plan") ?? "");

  const back = athleteProfileId
    ? `/staff/notes?athleteId=${encodeURIComponent(athleteProfileId)}`
    : "/staff/notes";

  if (!athleteProfileId) {
    redirect(
      `/staff/notes?error=${encodeURIComponent("Missing athlete selection.")}`,
    );
  }

  const res = await createStaffCapNoteForUser(user, {
    athleteId: athleteProfileId,
    context,
    action,
    plan,
  });

  if (!res.ok) {
    redirect(`${back}&error=${encodeURIComponent(res.message)}`);
  }

  revalidatePath("/staff/notes");
  redirect(back);
}
