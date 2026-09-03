import { redirect } from "next/navigation";
import { Database } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserWithProfile } from "@/lib/auth";
import { getLiveRoster, LPS_TENANT_ID } from "@/lib/data/members";
import { isStaff } from "@/lib/rbac";
import { getResolvedTenant } from "@/lib/tenant/context";

import { RosterTable } from "./roster-table";

/**
 * The LIVE imported roster — real members from the database, read-only.
 * Tenant hosts read their own tenant; the LPS demo build reads the LPS
 * roster. Renders a setup notice (and the nav item hides entirely) on
 * deployments without server credentials, so the public demo never
 * exposes real member data.
 */
export default async function LiveRosterPage() {
  const user = await requireUserWithProfile();
  if (!isStaff(user)) redirect("/athlete/dashboard");

  const tenant = await getResolvedTenant();
  const rows = await getLiveRoster(tenant?.id ?? LPS_TENANT_ID);

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
              The live roster is stored server-side only and needs this
              deployment&apos;s <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              to read it. Add the key to the environment and reload — the demo
              data everywhere else is unaffected either way.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
