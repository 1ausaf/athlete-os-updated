"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestPasswordResetAction, type ResetState } from "./actions";

const INITIAL: ResetState = { done: false, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ResetForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, INITIAL);

  if (state.done) {
    return (
      <p className="rounded-lg border border-border bg-surface/60 p-4 text-sm text-muted-foreground">
        If an account exists for that email, we&apos;ve sent instructions.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
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
