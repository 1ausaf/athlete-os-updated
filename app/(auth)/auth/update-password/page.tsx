import { Pill } from "@/components/ui/pill";

import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Pill tone="brand" dot className="w-fit">
          Account security
        </Pill>
        <h1 className="text-3xl">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password you don&apos;t use anywhere else.
        </p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
