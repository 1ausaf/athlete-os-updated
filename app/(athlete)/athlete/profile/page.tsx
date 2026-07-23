import { PageHeader } from "@/components/app/page-header";
import { athleteProfileById, type AthleteProfile } from "@/lib/demo/data";
import { requireAthleteContext } from "@/lib/demo/session";

import { ProfileForm } from "./profile-form";

/**
 * Self-service profile (A20): the athlete (or their parent) keeps address,
 * contact info, socials and recruiting links current — the coach card
 * prepopulates from here.
 */
export default async function AthleteProfilePage() {
  const { athlete, isParentView } = requireAthleteContext();

  const fallback: AthleteProfile = {
    athleteId: athlete.id,
    email: "",
    phone: "",
    address: { street: "", city: "", region: "ON", postal: "" },
    dob: `${athlete.yearOfBirth}-01-01`,
  };
  const profile = athleteProfileById(athlete.id) ?? fallback;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Profile"
        title={isParentView ? `${athlete.name} — profile` : "Your profile"}
        description="Keep your contact details, address and links current — the coaching staff works from what you save here."
      />

      <ProfileForm
        initial={profile}
        athleteName={athlete.name}
        gender={athlete.gender}
        isMinor={athlete.isMinor}
        isParentView={isParentView}
      />
    </div>
  );
}
