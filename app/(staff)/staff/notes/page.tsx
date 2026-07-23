import { redirect } from "next/navigation";

/**
 * Notes now live inside each athlete's profile (managed per-athlete, the
 * way the client runs their Trello board). The standalone notes route is
 * retired — send any stale links to the roster.
 */
export default function StaffNotesPage() {
  redirect("/staff/athletes");
}
