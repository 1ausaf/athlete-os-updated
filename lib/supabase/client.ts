"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/db";

/**
 * Browser-side Supabase client. Safe to import in client components.
 * Reads only `NEXT_PUBLIC_*` env vars - never the service role key.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
