import { redirect } from "next/navigation";

/**
 * The athlete inbox collapsed into a single coaching-staff channel, so old
 * per-thread URLs (e.g. from the dashboard Messages tile) land on the portal.
 */
export default function AthleteThreadPage() {
  redirect("/athlete/messages");
}
