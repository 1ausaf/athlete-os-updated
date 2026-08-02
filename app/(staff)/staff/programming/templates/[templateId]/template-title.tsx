"use client";

import { useState } from "react";

import type { ProgramTemplate } from "@/lib/demo/training";

type Level = ProgramTemplate["level"];

const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];

/**
 * G6 — the template title is click-to-rename (same affordance as day
 * renaming in the builder) with a Level select right next to it. Local
 * state; the Program Library's Level column shows the same scale.
 */
export function TemplateTitle({
  initialName,
  initialLevel,
}: {
  initialName: string;
  initialLevel: Level;
}) {
  const [name, setName] = useState(initialName);
  const [level, setLevel] = useState<Level>(initialLevel);

  return (
    <span className="flex w-full flex-wrap items-center gap-2.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Rename this program"
        title="Click to rename this program — saves locally in this demo"
        size={Math.max(name.length, 12)}
        className="min-w-0 max-w-full rounded-md border border-transparent bg-transparent px-1 font-display text-3xl font-extrabold tracking-tight transition-colors hover:border-border focus-visible:border-border focus-visible:outline-none md:text-4xl"
      />
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value as Level)}
        aria-label="Program level"
        title="Program level — shows in the Program Library"
        className="h-8 shrink-0 rounded-md border border-border bg-surface px-1.5 font-sans text-xs font-semibold tracking-normal text-foreground focus-visible:outline-none"
      >
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </span>
  );
}
