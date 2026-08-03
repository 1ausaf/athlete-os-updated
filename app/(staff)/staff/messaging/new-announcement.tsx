"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Megaphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * R8 (H1) — admins post facility-wide announcements straight from the Chats
 * page: title + body, lands in every member's feed. Local state only.
 */
export function NewAnnouncementButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function post() {
    setOpen(false);
    setTitle("");
    setBody("");
    setFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 3200);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4" />
        New announcement
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm md:py-16"
          role="dialog"
          aria-modal="true"
          aria-label="New announcement"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border bg-surface/60 p-4">
              <div>
                <h3 className="text-base font-bold">New announcement</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lands in every member&apos;s feed — replies route privately to
                  staff.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input
                  value={title}
                  placeholder="e.g. Holiday hours next week"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea
                  rows={5}
                  value={body}
                  placeholder="What every member should know…"
                  onChange={(e) => setBody(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="mr-auto text-[0.7rem] text-muted-foreground">
                  Saves locally in this demo.
                </span>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="brand"
                  size="sm"
                  disabled={!title.trim() || !body.trim()}
                  onClick={post}
                >
                  <Megaphone className="h-4 w-4" />
                  Post announcement
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {flash ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-success/40 bg-card px-3.5 py-2 text-xs font-semibold shadow-raised"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Announcement posted — it lands in every member&apos;s feed.
        </div>
      ) : null}
    </>
  );
}
