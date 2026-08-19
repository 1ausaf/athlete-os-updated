"use client";

import type { Route } from "next";
import { useEffect, useState } from "react";
import {
  Apple,
  CalendarDays,
  CircleUserRound,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  MessagesSquare,
  UserRound,
} from "lucide-react";

import type { Athlete } from "@/lib/demo/data";
import { threads } from "@/lib/demo/data";
import {
  ANN_STORE_EVENT,
  memberAnnouncementFeed,
} from "@/lib/demo/announcements-store";
import { canViewBilling } from "@/lib/rbac";
import type { AppUser } from "@/types/user";

import { ShellNav, type ShellNavItem } from "./shell-nav";

/** Round 8 (M33): announcement read-state — the Chat badge counts unread. */
export const ANNOUNCEMENT_READ_KEY = "aos-ann-read";

export function AthleteNav({
  user,
  athlete,
}: {
  user: AppUser;
  /** The athlete being viewed — self, or a parent's selected child. */
  athlete: Athlete;
}) {
  // Round 13 (C2): once the member opens their chat, its unread count is
  // seen — the badge clears and stays cleared.
  const [unread, setUnread] = useState(() =>
    threads
      .filter((t) => t.participants.some((p) => p.id === athlete.id))
      .reduce((n, t) => n + t.unread, 0),
  );
  useEffect(() => {
    const recount = () => {
      let seen: Record<string, string> = {};
      try {
        seen = JSON.parse(
          window.localStorage.getItem("aos-chat-seen") ?? "{}",
        ) as Record<string, string>;
      } catch {
        /* corrupt store — keep seed counts */
      }
      setUnread(
        seen[athlete.id]
          ? 0
          : threads
              .filter((t) => t.participants.some((p) => p.id === athlete.id))
              .reduce((n, t) => n + t.unread, 0),
      );
    };
    recount();
    window.addEventListener("aos-chat-seen-changed", recount);
    return () => window.removeEventListener("aos-chat-seen-changed", recount);
  }, [athlete.id]);

  // Unread announcements (post-mount so SSR and client agree).
  const [annUnread, setAnnUnread] = useState(0);
  useEffect(() => {
    const readCount = () => {
      try {
        const read = JSON.parse(
          window.localStorage.getItem(ANNOUNCEMENT_READ_KEY) ?? "[]",
        ) as string[];
        // Round 11 (M28): archived announcements don't count as unread.
        setAnnUnread(
          memberAnnouncementFeed().filter((a) => !read.includes(a.id)).length,
        );
      } catch {
        setAnnUnread(memberAnnouncementFeed().length);
      }
    };
    readCount();
    window.addEventListener("aos-ann-read-changed", readCount);
    window.addEventListener(ANN_STORE_EVENT, readCount);
    return () => {
      window.removeEventListener("aos-ann-read-changed", readCount);
      window.removeEventListener(ANN_STORE_EVENT, readCount);
    };
  }, []);

  const hasNutrition = athlete.nutrition === "pro";
  const isParent = user.role === "parent";

  const items: ShellNavItem[] = [
    { href: "/athlete/dashboard", label: "Today", icon: LayoutDashboard },
    { href: "/athlete/training", label: "Training", icon: Dumbbell },
    { href: "/athlete/sessions", label: "Bookings", icon: CalendarDays },
    {
      href: "/athlete/messages",
      label: "Chat",
      icon: MessagesSquare,
      badge: unread + annUnread || undefined,
    },
    {
      href: "/athlete/nutrition",
      label: "Nutrition",
      icon: Apple,
      // Round 10 (R3): no "Pro" tag beside Nutrition — locked state only.
      locked: !hasNutrition,
    },
    { href: "/athlete/assessment", label: "Assessment", icon: ClipboardCheck },
  ];

  if (canViewBilling(user)) {
    items.push({ href: "/athlete/billing", label: "Billing", icon: CreditCard });
  }

  items.push({ href: "/athlete/profile", label: "Profile", icon: UserRound });

  // P3 — parents get their OWN profile, separate from the kids' profiles.
  if (isParent) {
    items.push({
      href: "/athlete/parent" as Route,
      label: "My Profile",
      icon: CircleUserRound,
    });
  }

  return (
    <ShellNav
      title="Member Portal"
      subtitle={
        isParent ? `${user.fullName} · managing ${athlete.name}` : user.fullName
      }
      items={items}
    />
  );
}
