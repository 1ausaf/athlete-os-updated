import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/app/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUserWithProfile } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { complianceRows, facility, threads } from "@/lib/demo/data";

export default async function StaffCompliancePage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const gaps = complianceRows.filter((r) => r.status === "gap").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Staff Workspace · Safe-Sport"
        title="Compliance"
        description="Rule-of-Two coverage across every thread that includes a minor athlete. This is the flagship guardrail — enforced, logged, and impossible to override."
        actions={
          <Pill
            tone={gaps === 0 ? "success" : "danger"}
            icon={
              gaps === 0 ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )
            }
          >
            {gaps === 0 ? "All clear" : `${gaps} open gap${gaps === 1 ? "" : "s"}`}
          </Pill>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Rule-of-Two coverage"
          value={facility.ruleOfTwoCoveragePct}
          unit="%"
          icon={ShieldCheck}
          accent
          delta={{ value: "enforced", direction: "flat" }}
          hint="of minor threads"
        />
        <StatTile
          label="Minor athletes"
          value={facility.minorAthletes}
          icon={Users}
          hint="guardian-linked"
        />
        <StatTile
          label="Threads audited"
          value={threads.length}
          icon={Archive}
          hint={`${complianceRows.length} involve a minor`}
        />
        <StatTile
          label="Open gaps"
          value={gaps}
          icon={gaps === 0 ? CheckCircle2 : ShieldAlert}
          hint={gaps === 0 ? "nothing to action" : "blocked until resolved"}
        />
      </div>

      {/* Explainer */}
      <Card className="overflow-hidden">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="eyebrow">How the Rule of Two works</span>
            </div>
            <p className="text-pretty text-sm text-muted-foreground">
              A coach and a minor athlete can never be alone in a conversation.
              Any thread that includes a minor must also include a second adult —
              a parent/guardian or a second coach — before a single message can
              be sent.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5">
            <Rule
              icon={ShieldCheck}
              tone="success"
              text="Every minor thread requires a second adult (guardian or 2nd coach)."
            />
            <Rule
              icon={ShieldAlert}
              tone="danger"
              text="No admin override. Gaps block the thread rather than being waved through."
            />
            <Rule
              icon={Clock}
              tone="info"
              text="Every message is logged, timestamped, and retained for the audit record."
            />
          </ul>
        </CardContent>
      </Card>

      {/* Audit table */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg">Thread audit</h2>
              <p className="text-sm text-muted-foreground">
                Every conversation involving a minor athlete and its second-adult
                status.
              </p>
            </div>
            <Pill tone="neutral" icon={<Archive className="h-3.5 w-3.5" />}>
              Immutable log
            </Pill>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Athlete</TableHead>
                  <TableHead className="hidden md:table-cell">Adults present</TableHead>
                  <TableHead className="text-center">Guardian</TableHead>
                  <TableHead className="text-center">2nd coach</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceRows.map((row) => {
                  const compliant = row.status === "ok";
                  return (
                    <TableRow
                      key={row.threadId}
                      className={
                        compliant
                          ? undefined
                          : "border-destructive/20 bg-destructive/[0.05] hover:bg-destructive/[0.08]"
                      }
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/staff/messaging/${row.threadId}` as Route}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.athlete}
                        </Link>
                        <span className="ml-2 align-middle">
                          <Pill tone="info">Minor</Pill>
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {row.adults.map((name) => (
                            <Pill key={name} tone="neutral">
                              {name}
                            </Pill>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <YesNo yes={row.guardianPresent} />
                      </TableCell>
                      <TableCell className="text-center">
                        <YesNo yes={row.secondCoachPresent} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Pill
                          tone={compliant ? "success" : "danger"}
                          dot
                          className="ml-auto"
                        >
                          {compliant ? "Compliant" : "Gap"}
                        </Pill>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            All messages are logged, timestamped and retained — the audit trail is
            append-only and cannot be edited or deleted.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={"/staff/messaging" as Route}>Open messaging</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={"/staff/athletes" as Route}>Back to roster</Link>
        </Button>
      </div>
    </div>
  );
}

function Rule({
  icon: Icon,
  tone,
  text,
}: {
  icon: typeof ShieldCheck;
  tone: "success" | "danger" | "info";
  text: string;
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : "text-info";
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-border bg-surface/50 px-3 py-2.5 text-sm">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <span className="text-foreground/90">{text}</span>
    </li>
  );
}

function YesNo({ yes }: { yes: boolean }) {
  return yes ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-4 w-4" />
      Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      —
    </span>
  );
}
