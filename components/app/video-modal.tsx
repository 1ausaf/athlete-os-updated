"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LibraryExercise } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

/**
 * Shared inline video modal (C14) — the coach-side twin of the athlete
 * logger's player. One video per movement; circuit blocks get a playlist
 * to flip through. Escape closes, arrow keys navigate the playlist.
 */
export function VideoModal({
  lib,
  onClose,
}: {
  lib: LibraryExercise;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const playlist = lib.circuit ?? null;

  useEffect(() => {
    const max = (lib.circuit?.length ?? 1) - 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, max));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lib]);

  const current = playlist
    ? playlist[Math.min(index, playlist.length - 1)]
    : null;
  const title = current ? current.name : lib.name;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} demo video`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto scrollbar-slim rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="eyebrow">Exercise demo</span>
            <h3 className="mt-1 truncate text-lg">{title}</h3>
            {playlist ? (
              <p className="text-xs text-muted-foreground">
                Video {Math.min(index, playlist.length - 1) + 1} of{" "}
                {playlist.length} — {lib.name}
                {current ? ` · ${current.prescription}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface/60 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inline player — plays right here, no YouTube hand-off. */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground">
              <Play className="h-6 w-6 fill-current pl-0.5" />
            </span>
            <span className="px-4 text-center text-xs">
              Coach demo — {title}
            </span>
            <span className="px-4 text-center text-[0.65rem] text-muted-foreground/70">
              Demo build — production streams the clip inline here.
            </span>
          </div>
          {playlist ? (
            <>
              <button
                type="button"
                aria-label="Previous video"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next video"
                disabled={index >= playlist.length - 1}
                onClick={() =>
                  setIndex((i) => Math.min(i + 1, playlist.length - 1))
                }
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground transition-colors hover:bg-accent disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        {/* Playlist — click through every movement in the block. */}
        {playlist ? (
          <ol className="flex flex-col gap-1">
            {playlist.map((item, i) => {
              const active = i === index;
              return (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      active
                        ? "border-brand/40 bg-brand/10"
                        : "border-border bg-surface/50 hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                        active
                          ? "bg-brand text-brand-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {i + 1}. {item.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.prescription}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : lib.pointsOfPerformance.length > 0 ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Points of performance
            </span>
            <ul className="mt-2 flex flex-col gap-1.5">
              {lib.pointsOfPerformance.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-ink"
                    aria-hidden
                  />
                  <span className="text-pretty">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
