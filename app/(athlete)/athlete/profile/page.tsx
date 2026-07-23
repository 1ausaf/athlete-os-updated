import { PageHeader } from "@/components/app/page-header";

/** Placeholder — replaced by the full self-service profile (W7). */
export default function AthleteProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Athlete Portal · Profile"
        title="Your profile"
        description="Contact details, socials and account info."
      />
    </div>
  );
}
