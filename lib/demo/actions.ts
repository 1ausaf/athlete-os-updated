"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { DemoRole } from "@/lib/demo/data";
import { DEMO_ROLE_COOKIE, PERSONAS, homePathForRole } from "@/lib/demo/session";

/** Switch the active demo persona and land in that role's workspace. */
export async function setPersona(role: DemoRole): Promise<void> {
  cookies().set(DEMO_ROLE_COOKIE, role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect(homePathForRole(PERSONAS[role].user.role));
}
