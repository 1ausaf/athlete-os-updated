import { redirect } from "next/navigation";
import { Database } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuthContext } from "@/lib/authz/guards";
import {
  demoLiveRosterAllowed,
  getLiveRoster,
  LPS_TENANT_ID,
  type LiveRosterRow,
} from "@/lib/data/members";
import { isStaff } from "@/lib/rbac";

import { RosterTable } from "./roster-table";

/**
 * The LIVE imported roster — real members, read-only. Access chain:
 * - Tenant hosts: REAL Supabase session + active membership + roster:view.
 *   Persona/pilot identities are refused — this is the one surface holding
 *   live PII, so persona cookies can never open it on a tenant host.
 * - Demo hosts: fictional-data surface by default; the real roster renders
 *   only behind the explicit ALLOW_DEMO_LIVE_ROSTER=1 + service-key opt-in
 *   (private/local viewing).
 */
export default async function LiveRosterPage() {
  const ctx = await requireAuthContext();
  if (!isStaff(ctx.user)) redirect("/athlete/dashboard");

  let rows: LiveRosterRow[] | null = null;

  if (ctx.mode === "tenant") {
    if (!ctx.isRealAuth || !ctx.permissions.has("roster:view")) {
      redirect("/staff/athletes");
    }
    rows = await getLiveRoster(ctx.tenant!.id);
  } else if (demoLiveRosterAllowed()) {
    rows = await getLiveRoster(LPS_TENANT_ID);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Live Roster"
        description="The real imported member roster, straight from the database — read-only until member logins launch."
      />
      {rows ? (
        <RosterTable rows={rows} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand/20 bg-brand/10 text-brand-ink">
              <Database className="h-5 w-5" />
            </span>
            <h2 className="text-lg">Not connected on this deployment</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              The live roster is stored server-side only. It renders for
              authenticated staff on a workspace domain, or on demo builds
              that explicitly opt in with{" "}
              <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> +{" "}
              <code className="font-mono">ALLOW_DEMO_LIVE_ROSTER=1</code>. The
              demo data everywhere else is unaffected either way.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
