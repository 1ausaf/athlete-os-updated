"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updatePasswordAction, type UpdatePasswordState } from "./actions";

const INITIAL: UpdatePasswordState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" className="w-full" disabled={pending}>
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useFormState(updatePasswordAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
