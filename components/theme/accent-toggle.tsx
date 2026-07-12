"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export type Accent = "red" | "volt";

const STORAGE_KEY = "aos-accent";

function readAccent(): Accent {
  if (typeof document === "undefined") return "red";
  return document.documentElement.getAttribute("data-accent") === "volt"
    ? "volt"
    : "red";
}

/**
 * Flips the brand accent between LPS red (default) and the alternate volt
 * look, so both directions from the client's feedback can be compared live.
 */
export function AccentToggle({ className }: { className?: string }) {
  const [accent, setAccent] = useState<Accent>("red");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAccent(readAccent());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Accent = accent === "red" ? "volt" : "red";
    if (next === "volt") {
      document.documentElement.setAttribute("data-accent", "volt");
    } else {
      document.documentElement.removeAttribute("data-accent");
    }
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    setAccent(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch accent color (current: ${mounted ? accent : "red"})`}
      title={
        mounted && accent === "red"
          ? "Accent: LPS red — click for volt"
          : "Accent: volt — click for LPS red"
      }
      className={className}
      onClick={toggle}
    >
      <span className="relative inline-flex">
        <Palette className="h-[1.1rem] w-[1.1rem]" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-background" />
      </span>
    </Button>
  );
}
