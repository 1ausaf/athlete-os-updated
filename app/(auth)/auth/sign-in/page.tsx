import Link from "next/link";

import { Pill } from "@/components/ui/pill";
import { getTenantBranding } from "@/lib/tenant/branding";
import { getResolvedTenant } from "@/lib/tenant/context";

import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { error?: string; reset?: string };
}) {
  const branding = await getTenantBranding();
  const tenant = await getResolvedTenant();
  // Real Supabase sign-in on non-pilot tenant hosts; pilot tenants and demo
  // hosts keep the persona demo (fictional data only).
  const realAuth = Boolean(tenant && tenant.status !== "pilot");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Pill tone="brand" dot className="w-fit">
          Welcome back
        </Pill>
        <h1 className="text-3xl">Sign in to {branding.name}</h1>
        <p className="text-sm text-muted-foreground">
          Access your training, sessions, messages and billing. Coaches and
          owners land in the staff console.
        </p>
      </div>

      {searchParams?.error === "denied" ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium">
          You don&apos;t have access to this workspace.
        </p>
      ) : null}
      {searchParams?.reset === "done" ? (
        <p className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm font-medium">
          Password updated — sign in with your new password.
        </p>
      ) : null}

      <SignInForm tenantHost={realAuth} />

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          Talk to the {branding.name} team
        </Link>
      </p>
    </div>
  );
}
