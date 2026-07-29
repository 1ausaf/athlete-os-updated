"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";

type PushState = "unsupported" | "default" | "granted" | "denied";

/**
 * O5 — the real browser web-push permission flow. Most coaches run the app
 * on their phones, so the demo triggers `Notification.requestPermission()`
 * for this site and reflects the result.
 */
export function EnablePushButton({ hint }: { hint?: string }) {
  const [state, setState] = useState<PushState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission);
  }, []);

  async function request() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setState(result);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={request}
          disabled={state === "unsupported" || state === "granted"}
        >
          <BellRing className="h-4 w-4" />
          Enable push on this device
        </Button>
        {state === "granted" ? (
          <Pill tone="success" dot>
            Granted
          </Pill>
        ) : state === "denied" ? (
          <Pill tone="danger" dot>
            Denied — allow in browser settings
          </Pill>
        ) : state === "unsupported" ? (
          <Pill tone="neutral">Not supported in this browser</Pill>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
