"use client";

import {
  CalendarRange,
  ClipboardList,
  CreditCard,
  LineChart,
  MessagesSquare,
  ShieldCheck,
  UserCog,
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
    { href: "/staff/athletes", label: "Athletes", icon: Users },
    {
      href: "/staff/programming",
      label: "Programming",
      icon: ClipboardList,
      badge: programsDue || undefined,
    },
    { href: "/staff/sessions", label: "Sessions", icon: CalendarRange },
    {
      href: "/staff/messaging",
      label: "Messaging",
      icon: MessagesSquare,
      badge: unread || undefined,
    },
    { href: "/staff/analytics", label: "Analytics", icon: LineChart },
    {
      href: "/staff/compliance",
      label: "Compliance",
      icon: ShieldCheck,
      badge: gaps || undefined,
    },
  ];

  if (canViewBilling(user) || canManageMemberships(user)) {
    items.push({ href: "/staff/billing", label: "Billing", icon: CreditCard });
  }

  if (isAdmin(user)) {
    items.push({ href: "/staff/team", label: "Team", icon: UserCog });
  }

  return (
    <ShellNav
      title="Staff Workspace"
      subtitle={`${user.fullName} · ${user.role}`}
      items={items}
    />
  );
}
