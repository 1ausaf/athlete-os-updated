import { Pill } from "@/components/ui/pill";
import { getTenantBranding } from "@/lib/tenant/branding";

import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage() {
  const branding = await getTenantBranding();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Pill tone="brand" dot className="w-fit">
          Password reset
        </Pill>
        <h1 className="text-3xl">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter the email you use with {branding.name} and we&apos;ll send a
          reset link.
        </p>
      </div>
      <ResetForm />
    </div>
  );
}
