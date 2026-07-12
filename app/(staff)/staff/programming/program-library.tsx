"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Globe } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Pill, type PillTone } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { athletes } from "@/lib/demo/data";
import {
  LIBRARY_TOTALS,
  programTemplates,
  type ProgramTemplate,
} from "@/lib/demo/training";

const levelTone: Record<ProgramTemplate["level"], PillTone> = {
  Beginner: "info",
  Intermediate: "neutral",
  Advanced: "brand",
};

/**
 * Master-program library. "Copy to athlete…" is the client's real workflow:
 * a master template is copied onto an athlete, then tailored in the builder.
 * Demo-only — the copy is local state with a success flash.
 */
export function ProgramLibrary() {
  const [copied, setCopied] = useState<Record<string, string | undefined>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function copyTo(templateId: string, athleteId: string) {
    const name = athletes.find((a) => a.id === athleteId)?.name ?? "athlete";
    setCopied((prev) => ({ ...prev, [templateId]: name }));
    timers.current.push(
      setTimeout(
        () => setCopied((prev) => ({ ...prev, [templateId]: undefined })),
        2600,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        <span className="tnum font-semibold text-foreground">
          {LIBRARY_TOTALS.programs}
        </span>{" "}
        programs in the library · showing {programTemplates.length} masters —
        copy one onto an athlete, then tailor it in their builder.
      </p>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {programTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{tpl.name}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={levelTone[tpl.level]}>{tpl.level}</Pill>
                    <Pill tone="neutral" className="tnum">
                      {tpl.weeks} wk × {tpl.daysPerWeek} d/wk
                    </Pill>
                    {tpl.remoteDays ? (
                      <Pill tone="info" icon={<Globe className="h-3 w-3" />}>
                        {tpl.remoteDays}× remote/wk
                      </Pill>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {tpl.description} — {tpl.createdBy}
                  </p>
                </div>

                <div className="shrink-0">
                  {copied[tpl.id] ? (
                    <Pill
                      tone="success"
                      icon={<CheckCircle2 className="h-3 w-3" />}
                    >
                      Copied to {copied[tpl.id]}
                    </Pill>
                  ) : (
                    <Select
                      value=""
                      onValueChange={(athleteId) => copyTo(tpl.id, athleteId)}
                    >
                      <SelectTrigger
                        className="h-8 w-48 text-xs"
                        aria-label={`Copy ${tpl.name} to an athlete`}
                      >
                        <SelectValue placeholder="Copy to athlete…" />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
