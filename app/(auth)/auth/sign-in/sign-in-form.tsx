"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPersona } from "@/lib/demo/actions";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  findDemoAccount,
} from "@/lib/demo/accounts";
import { cn } from "@/lib/utils";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) return setError("Enter your email to continue.");
    if (!password) return setError("Enter your password.");

    const account = findDemoAccount(email);
    if (!account) {
      return setError(
        "No account matches that email. Try one of the demo accounts below.",
      );
    }
    // Demo: any non-empty password is accepted.
    startTransition(() => setPersona(account.role));
  }

  function prefillAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@lpsathletic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="text-xs text-muted-foreground">
              Demo — any password works
            </span>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
        </div>

        {error ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="brand" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Quick demo accounts
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={pending}
            onClick={() => prefillAccount(a.email)}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-3 py-2 text-left transition-colors hover:bg-accent",
              email.toLowerCase() === a.email.toLowerCase() &&
                "border-brand/40 bg-brand/5",
            )}
          >
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{a.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {a.email}
              </span>
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Prefill →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
