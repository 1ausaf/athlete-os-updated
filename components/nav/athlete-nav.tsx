"use client";

import {
  CalendarDays,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  MessagesSquare,
} from "lucide-react";

import { threads } from "@/lib/demo/data";
import { canViewBilling } from "@/lib/rbac";
import type { AppUser } from "@/types/user";

import { ShellNav, type ShellNavItem } from "./shell-nav";

export function AthleteNav({ user }: { user: AppUser }) {
  const unread = threads
    .filter((t) => t.participants.some((p) => p.id === user.id))
    .reduce((n, t) => n + t.unread, 0);

  const items: ShellNavItem[] = [
    { href: "/athlete/dashboard", label: "Today", icon: LayoutDashboard },
    { href: "/athlete/training", label: "Training", icon: Dumbbell },
    { href: "/athlete/sessions", label: "Sessions", icon: CalendarDays },
    {
      href: "/athlete/messages",
      label: "Messages",
      icon: MessagesSquare,
      badge: unread || undefined,
    },
  ];

  if (canViewBilling(user)) {
    items.push({ href: "/athlete/billing", label: "Billing", icon: CreditCard });
  }

  return <ShellNav title="Athlete Portal" subtitle={user.fullName} items={items} />;
}
