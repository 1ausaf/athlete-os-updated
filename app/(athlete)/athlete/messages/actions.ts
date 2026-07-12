"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserWithProfile } from "@/lib/auth";
import { sendThreadMessageForUser } from "@/lib/server/mutations";

export async function sendAthleteThreadMessage(formData: FormData) {
  const user = await getCurrentUserWithProfile();
  if (!user || user.role !== "athlete") {
    redirect("/staff/athletes");
  }

  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "");

  const back = `/athlete/messages/${encodeURIComponent(threadId)}`;

  if (!threadId) {
    redirect(
      `/athlete/messages?error=${encodeURIComponent("Missing thread.")}`,
    );
  }

  const res = await sendThreadMessageForUser(user, threadId, body);

  if (!res.ok) {
    redirect(`${back}?error=${encodeURIComponent(res.message)}`);
  }

  revalidatePath("/athlete/messages");
  revalidatePath(back);
  redirect(back);
}
