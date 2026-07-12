"use client";

import type { ComponentProps, ReactNode } from "react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { setPersona } from "@/lib/demo/actions";
import type { DemoRole } from "@/lib/demo/data";

/**
 * Marketing / auth CTA that activates a demo persona and routes into the
 * correct workspace. Guarantees the target layout won't bounce the visitor.
 */
export function EnterDemoButton({
  role,
  children,
  ...props
}: { role: DemoRole; children: ReactNode } & Omit<
  ComponentProps<typeof Button>,
  "onClick"
>) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending}
      onClick={() => startTransition(() => setPersona(role))}
    >
      {children}
    </Button>
  );
}
