"use client";

import {
  CalendarRange,
  ClipboardList,
  CreditCard,
  LineChart,
  MessagesSquare,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

import { athletes, complianceRows, threads } from "@/lib/demo/data";
import { canManageMemberships, canViewBilling, isAdmin } from "@/lib/rbac";
import type { AppUser } from "@/types/user";

import { ShellNav, type ShellNavItem } from "./shell-nav";

export function StaffNav({ user }: { user: AppUser }) {
  const unread = threads.reduce((n, t) => n + t.unread, 0);
  const gaps = complianceRows.filter((r) => r.status === "gap").length;
  const programsDue = athletes.filter((a) => a.programDueInDays <= 5).length;

  const items: ShellNavItem[] = [
    // Round 6: due-tracking lives in Members — the badge moved with it.
    {
      href: "/staff/athletes",
      label: "Members",
      icon: Users,
      badge: programsDue || undefined,
    },
    { href: "/staff/programming", label: "Programming", icon: ClipboardList },
    { href: "/staff/sessions", label: "Bookings", icon: CalendarRange },
    {
      href: "/staff/messaging",
      label: "Chats",
      icon: MessagesSquare,
      badge: unread || undefined,
    },
    { href: "/staff/analytics", label: "Analytics", icon: LineChart },
  ];

  // Round 6: coaches don't need Compliance — owners/admins keep it.
  if (isAdmin(user)) {
    items.push({
      href: "/staff/compliance",
      label: "Compliance",
      icon: ShieldCheck,
      badge: gaps || undefined,
    });
  }

  if (canViewBilling(user) || canManageMemberships(user)) {
    items.push({ href: "/staff/billing", label: "Billing", icon: CreditCard });
  }

  if (isAdmin(user)) {
    items.push({ href: "/staff/team", label: "Team", icon: UserCog });
  }

  items.push({ href: "/staff/profile", label: "Profile", icon: UserRound });

  return (
    <ShellNav
      title="Team Workspace"
      subtitle={`${user.fullName} · ${user.role}`}
      items={items}
    />
  );
}
