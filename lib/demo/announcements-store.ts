/**
 * Round 11 (M26–M28): announcement archive + staff-posted announcements.
 *
 * Seeds live in lib/demo/training.ts. This client-side store layers demo
 * persistence on top:
 *  - archive overrides (staff Archive / Restore — archived items leave the
 *    member feed but stay reusable on the staff side),
 *  - locally posted announcements (the staff "New announcement" dialog).
 *
 * Both athlete and staff surfaces listen for ANN_STORE_EVENT so the member
 * feed, tab counts and nav badge stay in sync.
 */

import {
  announcements,
  type Announcement,
} from "@/lib/demo/training";

export const ANN_ARCHIVED_KEY = "aos-ann-archive-overrides";
export const ANN_LOCAL_KEY = "aos-ann-local";
export const ANN_STORE_EVENT = "aos-ann-store-changed";

type ArchiveOverrides = Record<string, boolean>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(ANN_STORE_EVENT));
}

export function archiveOverrides(): ArchiveOverrides {
  return readJson<ArchiveOverrides>(ANN_ARCHIVED_KEY, {});
}

export function isArchived(a: Announcement): boolean {
  const overrides = archiveOverrides();
  return overrides[a.id] ?? a.archived ?? false;
}

export function setArchived(id: string, archived: boolean): void {
  writeJson(ANN_ARCHIVED_KEY, { ...archiveOverrides(), [id]: archived });
}

/** Announcements posted from the staff dialog this browser session. */
export function readLocalAnnouncements(): Announcement[] {
  return readJson<Announcement[]>(ANN_LOCAL_KEY, []);
}

export function appendLocalAnnouncement(a: Announcement): void {
  writeJson(ANN_LOCAL_KEY, [a, ...readLocalAnnouncements()]);
}

/** Everything, local + seeds, newest first. */
export function allAnnouncements(): Announcement[] {
  return [...readLocalAnnouncements(), ...announcements].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

/** The member feed: published only (archive overrides applied). */
export function memberAnnouncementFeed(): Announcement[] {
  return allAnnouncements().filter((a) => !isArchived(a));
}

/** Staff management view, split by status. */
export function staffAnnouncementLists(): {
  published: Announcement[];
  archived: Announcement[];
} {
  const all = allAnnouncements();
  return {
    published: all.filter((a) => !isArchived(a)),
    archived: all.filter((a) => isArchived(a)),
  };
}
