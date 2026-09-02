import Link from "next/link";

import { Pill } from "@/components/ui/pill";
import { getTenantBranding } from "@/lib/tenant/branding";

import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const branding = await getTenantBranding();

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

      <SignInForm />

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          Talk to the {branding.name} team
        </Link>
      </p>
    </div>
  );
}
