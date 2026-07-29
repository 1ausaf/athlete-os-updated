import { AthleteAvatar } from "@/components/app/athlete-avatar";
import { staffByName } from "@/lib/demo/staff";

/**
 * "Who's coming vs the coaches" — the two labeled avatar groups the client
 * asked for on every session block. Shared by the upcoming cards, the past
 * cards and the featured session.
 */
export function ComingVsCoach({
  roster,
  coachName,
  comingLabel = "Coming",
}: {
  roster: { id: string; initials: string; hue: number; name: string }[];
  coachName: string;
  comingLabel?: string;
}) {
  const coach = staffByName(coachName);
  const shown = roster.slice(0, 5);
  const extra = roster.length - shown.length;

  return (
    <div className="flex flex-wrap items-end gap-5">
      <div>
        <span className="eyebrow">{comingLabel}</span>
        <div className="mt-1.5 flex items-center">
          <div className="flex -space-x-2">
            {shown.map((a) => (
              <AthleteAvatar
                key={a.id}
                initials={a.initials}
                hue={a.hue}
                size="sm"
                ring
              />
            ))}
          </div>
          {extra > 0 ? (
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              +{extra}
            </span>
          ) : null}
          {roster.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No clients booked
            </span>
          ) : null}
        </div>
      </div>
      <div className="h-9 w-px self-end bg-border" aria-hidden />
      <div>
        <span className="eyebrow">Coach</span>
        <div className="mt-1.5 flex items-center gap-2">
          {coach ? (
            <AthleteAvatar
              initials={coach.initials}
              hue={coach.hue}
              size="sm"
              ring
            />
          ) : null}
          <span className="text-xs font-semibold">{coachName}</span>
        </div>
      </div>
    </div>
  );
}
