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
import { announcements } from "@/lib/demo/training";
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
  const unread = threads
    .filter((t) => t.participants.some((p) => p.id === athlete.id))
    .reduce((n, t) => n + t.unread, 0);

  // Unread announcements (post-mount so SSR and client agree).
  const [annUnread, setAnnUnread] = useState(0);
  useEffect(() => {
    const readCount = () => {
      try {
        const read = JSON.parse(
          window.localStorage.getItem(ANNOUNCEMENT_READ_KEY) ?? "[]",
        ) as string[];
        setAnnUnread(announcements.filter((a) => !read.includes(a.id)).length);
      } catch {
        setAnnUnread(announcements.length);
      }
    };
    readCount();
    window.addEventListener("aos-ann-read-changed", readCount);
    return () => window.removeEventListener("aos-ann-read-changed", readCount);
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
