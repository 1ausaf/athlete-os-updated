"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_CHILD_COOKIE } from "@/lib/demo/session";

/**
 * "Your athletes" card (P3): switch the managed child AND land on their
 * profile in one click — unlike the top-bar switcher, which goes to the
 * dashboard.
 */
export async function openChildProfile(athleteId: string): Promise<void> {
  cookies().set(DEMO_CHILD_COOKIE, athleteId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect("/athlete/profile");
}
