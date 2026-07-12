import { getAthleteIdForProfileId } from "@/lib/data/athletes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/db";

type CapNoteRow = Database["public"]["Tables"]["cap_notes"]["Row"];

export interface CapNoteCapFields {
  context: string;
  action: string;
  plan: string;
}

export type CapNoteWithParsed = CapNoteRow & {
  cap: CapNoteCapFields | null;
};

function encodeCapBody(fields: CapNoteCapFields): string {
  return JSON.stringify({
    capVersion: 1,
    context: fields.context,
    action: fields.action,
    plan: fields.plan,
  });
}

function parseCapBody(body: string): CapNoteCapFields | null {
  const t = body.trimStart();
  if (!t.startsWith("{")) return null;
  try {
    const v = JSON.parse(body) as {
      capVersion?: number;
      context?: string;
      action?: string;
      plan?: string;
    };
    if (v.capVersion !== 1) return null;
    if (
      typeof v.context !== "string" ||
      typeof v.action !== "string" ||
      typeof v.plan !== "string"
    ) {
      return null;
    }
    return { context: v.context, action: v.action, plan: v.plan };
  } catch {
    return null;
  }
}

/** Monday (UTC) as `YYYY-MM-DD`, aligned with `cap_notes.note_week_start`. */
export function mondayUtcWeekStartIso(d: Date): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = x.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + mondayOffset);
  return x.toISOString().slice(0, 10);
}

export async function listCapNotesForAthlete(
  athleteProfileId: string,
  limit: number,
): Promise<CapNoteWithParsed[]> {
  const athleteId = await getAthleteIdForProfileId(athleteProfileId);
  if (!athleteId) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cap_notes")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as CapNoteRow[]).map((row) => ({
    ...row,
    cap: parseCapBody(row.body),
  }));
}

export interface CreateCapNoteParams {
  authorProfileId: string;
  /** `athletes.id` */
  athleteId: string;
  context: string;
  action: string;
  plan: string;
  noteWeekStart?: string;
}

export async function createCapNoteForAthlete(
  params: CreateCapNoteParams,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createSupabaseServerClient();
  const body = encodeCapBody({
    context: params.context,
    action: params.action,
    plan: params.plan,
  });
  const noteWeekStart =
    params.noteWeekStart ?? mondayUtcWeekStartIso(new Date());

  const row: Database["public"]["Tables"]["cap_notes"]["Insert"] = {
    athlete_id: params.athleteId,
    author_profile_id: params.authorProfileId,
    body,
    note_week_start: noteWeekStart,
  };

  const { error } =
    // Supabase client can infer `.insert` as `never[]` when `Database` is self-referential.
    // Row shape matches `cap_notes` Insert.
    // @ts-expect-error -- insert payload is valid; see cap_notes Insert in types/db
    await supabase.from("cap_notes").insert([row]);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
