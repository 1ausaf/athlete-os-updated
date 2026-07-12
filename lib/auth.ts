import { getDemoUser } from "@/lib/demo/session";
import type { AppUser } from "@/types/user";

/**
 * DEMO MODE.
 *
 * The runnable demo has no Supabase backend. Authentication is simulated with a
 * cookie-selected persona (see `lib/demo/session.ts`) so every page renders with
 * a realistic signed-in user and personas can be switched from the top bar.
 *
 * The exported surface matches the original Supabase-backed module so callers
 * (layouts, pages, route handlers) are unchanged.
 */

export async function loadAppUser(): Promise<AppUser | null> {
  return getDemoUser();
}

export async function getCurrentUserWithProfile(): Promise<AppUser | null> {
  return getDemoUser();
}

export async function requireUserWithProfile(): Promise<AppUser> {
  return getDemoUser();
}
