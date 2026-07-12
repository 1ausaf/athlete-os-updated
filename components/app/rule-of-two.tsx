import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Pill } from "@/components/ui/pill";
import type { ThreadParticipant } from "@/lib/demo/data";
import { cn } from "@/lib/utils";

/**
 * Safe-Sport "Rule of Two" status banner. A thread involving a minor athlete
 * must include at least one additional adult (guardian or second coach).
 */
export function RuleOfTwoBanner({
  participants,
  className,
}: {
  participants: ThreadParticipant[];
  className?: string;
}) {
  const hasMinor = participants.some((p) => p.isMinor);
  const adults = participants.filter((p) => p.role !== "athlete");
  const guardianPresent = participants.some((p) => p.role === "guardian");
  const secondCoach = participants.filter((p) => p.role === "coach").length >= 2;
  const compliant = !hasMinor || guardianPresent || secondCoach;

  if (!hasMinor) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Adult athlete — direct 1:1 messaging permitted.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-3 py-2.5",
        compliant
          ? "border-success/30 bg-success/[0.06]"
          : "border-destructive/40 bg-destructive/[0.06]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        {compliant ? (
          <ShieldCheck className="h-4 w-4 text-success" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-destructive" />
        )}
        <span className={compliant ? "text-success" : "text-destructive"}>
          Safe-Sport Rule of Two —{" "}
          {compliant ? "satisfied" : "second adult required"}
        </span>
        <Pill tone={compliant ? "success" : "danger"} className="ml-auto">
          Minor athlete
        </Pill>
      </div>
      <p className="text-xs text-muted-foreground">
        {compliant
          ? "This thread includes a second adult, so it can never become a private 1:1 between a coach and a minor."
          : "Add a parent/guardian or a second coach before any message can be sent. No admin override is permitted."}
      </p>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {adults.map((a) => (
          <Pill key={a.id} tone="neutral" icon={<ShieldCheck className="h-3 w-3" />}>
            {a.name}
            <span className="opacity-60">· {a.role}</span>
          </Pill>
        ))}
      </div>
    </div>
  );
}
