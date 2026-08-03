"use client";

import { useState } from "react";

/**
 * G6 — the template title is click-to-rename (same affordance as day
 * renaming in the builder). Round 8: the Beginner/Intermediate/Advanced
 * select is gone — the audience labels below the header cover it.
 */
export function TemplateTitle({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);

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
    </span>
  );
}

/**
 * R8 (G6) — the description line is click-to-edit text: an invisible input
 * that shows its border on hover/focus, with a placeholder when empty.
 * Local state; saves locally in this demo.
 */
export function TemplateDescription({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      aria-label="Program description"
      title="Click to edit the description — saves locally in this demo"
      placeholder="Enter description (optional)"
      className="w-full min-w-64 rounded-md border border-transparent bg-transparent px-1 text-sm text-muted-foreground transition-colors placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-border focus-visible:outline-none"
    />
  );
}
