"use server";

import { redirect } from "next/navigation";

import { getCurrentUserWithProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

export async function signInWithPasswordAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  const user = await getCurrentUserWithProfile();
  if (!user) {
    return {
      error:
        "Profile or role is missing. Ask your facility administrator to finish onboarding.",
    };
  }

  if (user.role === "athlete") {
    redirect("/athlete/dashboard");
  }
  redirect("/staff/athletes");
}
