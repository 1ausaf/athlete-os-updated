"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserWithProfile } from "@/lib/auth";
import { isMinorFromDateOfBirth } from "@/lib/is-minor";
import { createThreadWithParticipants } from "@/lib/data/messaging";
import { sendThreadMessageForUser } from "@/lib/server/mutations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/rbac";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuidList(raw: string): string[] {
  return raw
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s));
}

export async function sendStaffThreadMessage(formData: FormData) {
  const user = await getCurrentUserWithProfile();
  if (!user || !isStaff(user)) {
    redirect("/athlete/dashboard");
  }

  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "");

  const back = `/staff/messaging/${encodeURIComponent(threadId)}`;

  if (!threadId) {
    redirect(`/staff/messaging?error=${encodeURIComponent("Missing thread.")}`);
  }

  const res = await sendThreadMessageForUser(user, threadId, body);

  if (!res.ok) {
    redirect(`${back}?error=${encodeURIComponent(res.message)}`);
  }

  revalidatePath("/staff/messaging");
  revalidatePath(back);
  redirect(back);
}

export async function createStaffThreadAction(formData: FormData) {
  const user = await getCurrentUserWithProfile();
  if (!user || !isStaff(user)) {
    redirect("/athlete/dashboard");
  }

  const back = "/staff/messaging/new";
  const athleteProfileIds = formData
    .getAll("athleteProfileId")
    .map((v) => String(v).trim())
    .filter((id) => UUID_RE.test(id));

  const extraRaw = String(formData.get("extraAdultProfileIds") ?? "");
  const extraIds = parseUuidList(extraRaw);

  if (!athleteProfileIds.length) {
    redirect(
      `${back}?error=${encodeURIComponent("Select at least one athlete.")}`,
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: dobRows, error: dobErr } = await supabase
    .from("profiles")
    .select("id, date_of_birth")
    .in("id", athleteProfileIds);

  if (dobErr || !dobRows?.length) {
    redirect(
      `${back}?error=${encodeURIComponent("Could not load athlete profiles.")}`,
    );
  }

  const anyMinor = (dobRows as { id: string; date_of_birth: string | null }[]).some(
    (r) => isMinorFromDateOfBirth(r.date_of_birth),
  );

  const staffIsMinor = Boolean(user.isMinor);
  const baseSet = new Set<string>([user.id, ...athleteProfileIds]);
  const extraDistinct = extraIds.filter((id) => !baseSet.has(id));

  if (anyMinor) {
    if (!extraDistinct.length) {
      redirect(
        `${back}?error=${encodeURIComponent(
          "When a minor athlete is included, add at least one additional adult participant (guardian or second coach) by profile ID.",
        )}`,
      );
    }
    if (staffIsMinor) {
      redirect(
        `${back}?error=${encodeURIComponent(
          "Staff account is marked as a minor; cannot start this thread.",
        )}`,
      );
    }
  }

  const participantProfileIds = [
    ...new Set([user.id, ...athleteProfileIds, ...extraIds]),
  ];

  const res = await createThreadWithParticipants({
    creatorProfileId: user.id,
    participantProfileIds,
    title: null,
  });

  if (!res.ok) {
    redirect(`${back}?error=${encodeURIComponent(res.message)}`);
  }

  revalidatePath("/staff/messaging");
  revalidatePath(`/staff/messaging/${res.threadId}`);
  redirect(`/staff/messaging/${res.threadId}`);
}
