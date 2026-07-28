import { CalendarClock, PauseCircle, Snowflake } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { fmtDay, type Athlete } from "@/lib/demo/data";

/**
 * Round 4: away/paused members keep their login and profile but no program
 * runs ("away — they can still log in, but basically there's no programs").
 * Shown in place of the program hero / session log for non-active members.
 */
export function NoProgramNotice({ athlete }: { athlete: Athlete }) {
  const away = athlete.status === "away";
  const Icon = away ? Snowflake : PauseCircle;
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-base font-bold">
            {away ? "You're marked away for the season" : "Your membership is paused"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground text-pretty">
            No program is running right now — your profile, history and PRs are
            all safe. When you&apos;re back, your coach publishes the next block
            and everything picks up where you left off.
          </p>
        </div>
        {athlete.followUpDate ? (
          <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            LPS will check in with you around {fmtDay(athlete.followUpDate)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
