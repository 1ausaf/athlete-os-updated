"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Copy,
  Megaphone,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ANN_STORE_EVENT,
  appendLocalAnnouncement,
  setArchived,
  staffAnnouncementLists,
} from "@/lib/demo/announcements-store";
import { fmtDay } from "@/lib/demo/data";
import type { Announcement } from "@/lib/demo/training";
import { cn } from "@/lib/utils";

type AnnView = "published" | "archived";

/**
 * R8 (H1) — admins post facility-wide announcements straight from the Chats
 * page. Round 11 (M28): the dialog is now a manager — posts persist to the
 * shared store, and a Published | Archived toggle lets the owner archive,
 * restore, or copy old announcements for reuse.
 */
export function NewAnnouncementButton({ staffName }: { staffName: string }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AnnView>("published");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  // M28 — the manager lists re-render whenever the store changes.
  const [lists, setLists] = useState<{
    published: Announcement[];
    archived: Announcement[];
  }>({ published: [], archived: [] });

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  useEffect(() => {
    const sync = () => setLists(staffAnnouncementLists());
    sync();
    window.addEventListener(ANN_STORE_EVENT, sync);
    return () => window.removeEventListener(ANN_STORE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function showFlash(message: string) {
    setFlash(message);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 3200);
  }

  function post() {
    appendLocalAnnouncement({
      id: `ann-local-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      author: staffName,
      at: new Date().toISOString(),
    });
    setTitle("");
    setBody("");
    setView("published");
    showFlash("Announcement posted — it lands in every member's feed.");
  }

  function copyBody(a: Announcement) {
    void navigator.clipboard?.writeText(a.body);
    showFlash("Copied — paste it into a new announcement.");
  }

  const shownRows = view === "published" ? lists.published : lists.archived;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4" />
        New announcement
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm md:py-12"
          role="dialog"
          aria-modal="true"
          aria-label="Announcements"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border bg-surface/60 p-4">
              <div>
                <h3 className="text-base font-bold">Announcements</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Post to every member&apos;s feed — replies route privately to
                  staff. Archived posts stay reusable.
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
                  rows={4}
                  value={body}
                  placeholder="What every member should know…"
                  onChange={(e) => setBody(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="mr-auto text-[0.7rem] text-muted-foreground">
                  Posts as {staffName}. Saves locally in this demo.
                </span>
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

              {/* M28 — Published | Archived manager */}
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  {(["published", "archived"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setView(key)}
                      aria-pressed={view === key}
                      className={cn(
                        "h-7 rounded-full border px-3 text-xs font-semibold capitalize transition-colors",
                        view === key
                          ? "border-brand/40 bg-brand/10 text-brand-ink"
                          : "border-border bg-surface text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {key} (
                      {key === "published"
                        ? lists.published.length
                        : lists.archived.length}
                      )
                    </button>
                  ))}
                </div>

                {shownRows.length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                    {view === "published"
                      ? "Nothing published yet."
                      : "Nothing archived — archived posts leave the member feed but stay here for reuse."}
                  </p>
                ) : (
                  <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {shownRows.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {a.title}
                          </p>
                          <p className="truncate text-[0.7rem] text-muted-foreground">
                            {a.author} · {fmtDay(a.at)}
                          </p>
                        </div>
                        {view === "published" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Archive — leaves the member feed, stays reusable here"
                            onClick={() => {
                              setArchived(a.id, true);
                              showFlash(
                                "Archived — members no longer see it.",
                              );
                            }}
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Copy the announcement text"
                              onClick={() => copyBody(a)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy text
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Restore to the member feed"
                              onClick={() => {
                                setArchived(a.id, false);
                                showFlash(
                                  "Restored — back in every member's feed.",
                                );
                              }}
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                              Restore
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
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
          {flash}
        </div>
      ) : null}
    </>
  );
}
