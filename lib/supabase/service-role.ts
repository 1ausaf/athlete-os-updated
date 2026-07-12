import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/db";

/**
 * Supabase client with the service role key. Bypasses RLS — use only from
 * trusted server code (e.g. payment webhooks), never from the browser.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createSupabaseServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
